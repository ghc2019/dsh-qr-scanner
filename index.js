/**
 * QR code reader bundle: one decoder, two callers.
 *
 * - `read_qr_code` agent tool: decodes an image file on disk.
 * - `POST /plugin/qr-scanner/decode?w=&h=`: receives RGBA pixels from the Web UI
 *   page and decodes them the same way. This is a raw handler route because the
 *   Web UI may only GET/HEAD a resource route; a handler owns every method.
 */
import { readFile } from 'node:fs/promises';
import { ImageDecodeError, decodeImageBuffer, decodeRgba, describeResult, sniffFormat } from './lib/decode.js';

export const name = 'qr-scanner';
export const inject = ['tools', 'webServer'];

const ROUTE = '/plugin/qr-scanner/decode';
const MAX_IMAGE_BYTES = 48 * 1024 * 1024;
const MAX_EDGE = 10000;
const MAX_OVERHEAD = 64 * 1024;

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: ROUTE, handler: handleDecodeRequest }), 'qr-scanner: decode route');
  ctx.effect(() => ctx.tools.register(buildTool()), 'qr-scanner: read_qr_code tool');
}

function buildTool() {
  return {
    name: 'read_qr_code',
    description: 'Read the QR code in an image file and return its decoded content, usually a link. Use it when the user gives an image path or asks what a QR code in a file contains. Supports PNG and JPEG. 中文：识别本地图片文件（PNG/JPEG）里的二维码，返回其中的链接或文本。',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path of a PNG or JPEG image file that contains a QR code.',
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          text: { type: 'string', description: 'Decoded QR content.' },
          kind: { type: 'string', enum: ['url', 'text'] },
          count: { type: 'integer' },
          format: { type: 'string', enum: ['png', 'jpeg'] },
          error: { type: 'string' },
        },
        additionalProperties: true,
      },
      render(_args, value) {
        const result = value !== null && typeof value === 'object' ? value : {};
        if (result.ok === true && typeof result.text === 'string') {
          return [{ type: 'text', text: result.text }];
        }
        const detail = typeof result.detail === 'string' ? ` (${result.detail})` : '';
        const message = result.error === 'not_found'
          ? 'No QR code was found in this image.'
          : `QR code could not be read: ${result.error ?? 'unknown error'}${detail}`;
        return [{ type: 'text', text: message }];
      },
    },
    async execute(args) {
      const path = typeof args?.path === 'string' ? args.path.trim() : '';
      if (path.length === 0) throw new Error('path is required');

      let buffer;
      try {
        buffer = await readFile(path);
      } catch (error) {
        throw new Error(`Cannot read "${path}": ${error instanceof Error ? error.message : String(error)}`);
      }
      if (buffer.length > MAX_IMAGE_BYTES) {
        return { ok: false, error: 'file_too_large', detail: `${buffer.length} bytes` };
      }
      const format = sniffFormat(buffer);
      if (format === undefined) {
        return { ok: false, error: 'unsupported_format', detail: 'only PNG and JPEG files can be read here' };
      }
      try {
        const image = decodeImageBuffer(buffer);
        return describeResult(decodeRgba(image.data, image.width, image.height), format);
      } catch (error) {
        if (error instanceof ImageDecodeError) return { ok: false, error: error.code, detail: error.message };
        throw error;
      }
    },
  };
}

async function handleDecodeRequest(request, response) {
  const url = new URL(request.url ?? ROUTE, 'http://127.0.0.1');
  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'method_not_allowed' }, { allow: 'POST' });
    return;
  }

  const width = Number.parseInt(url.searchParams.get('w') ?? '', 10);
  const height = Number.parseInt(url.searchParams.get('h') ?? '', 10);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > MAX_EDGE || height > MAX_EDGE) {
    sendJson(response, 400, { ok: false, error: 'bad_dimensions' });
    return;
  }

  const expected = width * height * 4;
  const declared = Number.parseInt(String(request.headers['content-length'] ?? ''), 10);
  if (Number.isFinite(declared) && declared !== expected) {
    sendJson(response, 400, { ok: false, error: 'bad_payload', expected, received: declared });
    return;
  }

  let bytes;
  try {
    bytes = await readBody(request, expected + MAX_OVERHEAD);
  } catch (error) {
    sendJson(response, 413, { ok: false, error: 'payload_too_large', detail: error instanceof Error ? error.message : String(error) });
    return;
  }
  if (bytes.length !== expected) {
    sendJson(response, 400, { ok: false, error: 'bad_payload', expected, received: bytes.length });
    return;
  }

  try {
    const pixels = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.length);
    sendJson(response, 200, describeResult(decodeRgba(pixels, width, height)));
  } catch (error) {
    if (error instanceof ImageDecodeError) {
      sendJson(response, 400, { ok: false, error: error.code, detail: error.message });
      return;
    }
    sendJson(response, 500, { ok: false, error: 'internal_error', detail: error instanceof Error ? error.message : String(error) });
  }
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('payload exceeds the expected image size'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function sendJson(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(payload);
}
