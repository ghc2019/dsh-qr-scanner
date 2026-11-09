// Smoke test: decode core + host tool + host route + client module.
// Run with `npm test` (dev deps: qrcode, react, react-dom).
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
import jpeg from 'jpeg-js';

const require = createRequire(import.meta.url);
const { decodeImageBuffer, decodeRgba, describeResult } = await import('../lib/decode.js');
const host = await import('../index.js');

const LINK = 'https://example.com/invite?code=ABC123';
let passed = 0;
const failed = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed.push(name);
    console.log(`FAIL ${name}\n     ${error && error.message}`);
  }
}

function pixelsOf(image) {
  return new Uint8ClampedArray(image.data.buffer, image.data.byteOffset, image.data.byteLength);
}

// Node-style request/response stand-ins for the handler route.
function fakeRequest(method, url, body) {
  const request = new EventEmitter();
  request.method = method;
  request.url = url;
  request.headers = body ? { 'content-length': String(body.length) } : {};
  request.destroy = () => {};
  process.nextTick(() => {
    if (body) request.emit('data', Buffer.from(body));
    request.emit('end');
  });
  return request;
}

function fakeResponse() {
  return {
    status: 0,
    headers: {},
    body: '',
    writeHead(status, headers) {
      this.status = status;
      Object.assign(this.headers, headers);
    },
    end(payload) {
      this.body = payload ?? '';
    },
  };
}

// ---------- decode core ----------

const png = await QRCode.toBuffer(LINK, { type: 'png', width: 320, margin: 2 });
const pngImage = decodeImageBuffer(png);
const jpg = jpeg.encode({ data: Buffer.from(pixelsOf(pngImage)), width: pngImage.width, height: pngImage.height }, 88).data;

function readImage(buffer) {
  const image = decodeImageBuffer(buffer);
  return describeResult(decodeRgba(image.data, image.width, image.height), image.format);
}

await check('PNG decodes to the link', () => {
  const result = readImage(png);
  assert.equal(result.ok, true);
  assert.equal(result.text, LINK);
  assert.equal(result.kind, 'url');
});

await check('JPEG decodes to the link', () => {
  const result = readImage(jpg);
  assert.equal(result.ok, true);
  assert.equal(result.text, LINK);
});

await check('raw RGBA decodes', () => {
  const { texts } = decodeRgba(pixelsOf(pngImage), pngImage.width, pngImage.height);
  assert.deepEqual(texts, [LINK]);
});

await check('inverted colors decode', () => {
  const copy = new Uint8ClampedArray(pixelsOf(pngImage));
  for (let i = 0; i < copy.length; i += 4) {
    copy[i] = 255 - copy[i];
    copy[i + 1] = 255 - copy[i + 1];
    copy[i + 2] = 255 - copy[i + 2];
  }
  const { texts } = decodeRgba(copy, pngImage.width, pngImage.height);
  assert.deepEqual(texts, [LINK]);
});

await check('blank image reports no code', () => {
  const blank = new Uint8ClampedArray(120 * 120 * 4).fill(255);
  const result = describeResult(decodeRgba(blank, 120, 120), 'png');
  assert.equal(result.ok, false);
  assert.equal(result.error, 'not_found');
});

// ---------- host plugin ----------

const registeredTools = new Map();
const registeredRoutes = [];
const fakeCtx = {
  effect(fn) {
    return fn();
  },
  tools: {
    register(definition) {
      registeredTools.set(definition.name, definition);
      return () => {};
    },
  },
  webServer: {
    register(route) {
      registeredRoutes.push(route);
      return () => {};
    },
  },
};
host.apply(fakeCtx);

const tool = registeredTools.get('read_qr_code');
const dir = await mkdtemp(join(tmpdir(), 'dsh-qr-'));
const pngPath = join(dir, 'code.png');
const jpgPath = join(dir, 'code.jpg');
const txtPath = join(dir, 'note.txt');
await writeFile(pngPath, png);
await writeFile(jpgPath, jpg);
await writeFile(txtPath, 'not an image');

await check('tool is registered', () => {
  assert.ok(tool, 'read_qr_code was not registered');
  assert.equal(typeof tool.execute, 'function');
  assert.equal(tool.parameters.properties.path.type, 'string');
  assert.deepEqual(tool.parameters.required, ['path']);
});

await check('tool reads a PNG path', async () => {
  const result = await tool.execute({ path: pngPath });
  assert.equal(result.ok, true);
  assert.equal(result.text, LINK);
  assert.equal(result.kind, 'url');
});

await check('tool reads a JPEG path', async () => {
  const result = await tool.execute({ path: jpgPath });
  assert.equal(result.ok, true);
  assert.equal(result.text, LINK);
});

await check('tool reports a missing file', async () => {
  await assert.rejects(() => tool.execute({ path: join(dir, 'nope.png') }), /Cannot read/);
});

await check('tool rejects a non-image file', async () => {
  const result = await tool.execute({ path: txtPath });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'unsupported_format');
});

await check('tool output renders a text block', () => {
  const blocks = tool.output.render({ path: pngPath }, { ok: true, text: LINK, kind: 'url' });
  assert.equal(blocks[0].type, 'text');
  assert.match(blocks[0].text, /example\.com/);
});

const route = registeredRoutes[0];
await check('route is registered at the expected path', () => {
  assert.ok(route, 'no route registered');
  assert.equal(route.path, '/plugin/qr-scanner/decode');
  assert.equal(route.kind, 'exact');
  assert.equal(typeof route.handler, 'function');
});

await check('route decodes posted pixels', async () => {
  const response = fakeResponse();
  await route.handler(
    fakeRequest('POST', `${route.path}?w=${pngImage.width}&h=${pngImage.height}`, pixelsOf(pngImage)),
    response,
  );
  assert.equal(response.status, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.text, LINK);
});

await check('route rejects GET', async () => {
  const response = fakeResponse();
  await route.handler(fakeRequest('GET', `${route.path}?w=10&h=10`), response);
  assert.equal(response.status, 405);
  assert.equal(response.headers.allow, 'POST');
});

await check('route rejects a short body', async () => {
  const response = fakeResponse();
  await route.handler(fakeRequest('POST', `${route.path}?w=100&h=100`, new Uint8Array(16)), response);
  assert.equal(response.status, 400);
  assert.equal(JSON.parse(response.body).error, 'bad_payload');
});

await rm(dir, { recursive: true, force: true });

// ---------- client module ----------

await check('client module registers a settings section', async () => {
  const loaded = {};
  globalThis.window = { __ModuleLoader__: { load(definition) { Object.assign(loaded, definition); } } };
  await import('../client.js');

  assert.equal(loaded.id, 'dsh-qr-scanner');
  assert.equal(typeof loaded.factory, 'function');

  const client = loaded.factory(require);
  assert.ok(client.inject.includes('slots'));

  const sections = [];
  const dicts = [];
  const clientCtx = {
    effect(fn) {
      return fn();
    },
    get() {
      return undefined;
    },
    locale: {
      register(namespace, locale, dict) {
        dicts.push({ namespace, locale, dict });
        return () => {};
      },
      bind() {
        return (key) => key;
      },
      subscribe() {
        return () => {};
      },
    },
    slots: {
      inject(name, setup) {
        assert.equal(name, 'settings.section');
        setup();
      },
      register(options, Component) {
        sections.push({ options, Component });
        return () => {};
      },
    },
  };
  client.apply(clientCtx);

  assert.equal(sections.length, 1);
  assert.equal(sections[0].options.id, 'qr-scanner');
  assert.equal(sections[0].options.order, 60);
  assert.equal(typeof sections[0].options.label, 'function');

  const zh = dicts.find((entry) => entry.locale.startsWith('zh'));
  const en = dicts.find((entry) => entry.locale.startsWith('en'));
  assert.equal(zh.dict.title, '二维码识别');
  assert.equal(en.dict.title, 'QR code reader');

  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const html = renderToStaticMarkup(React.createElement(sections[0].Component, { close() {} }));
  assert.match(html, /qrsc/);
  assert.match(html, /<style/);
  assert.match(html, /aria-|role="button"/);
});

console.log(`\n${passed} passed, ${failed.length} failed`);
if (failed.length) {
  console.log(`failing: ${failed.join(', ')}`);
  process.exit(1);
}
