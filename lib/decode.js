/**
 * Image decoding and QR detection shared by both entry points: the agent tool
 * (a file on disk) and the Web UI (RGBA pixels posted by the browser).
 *
 * Decoders are vendored under ../vendor so the bundle needs no dependencies.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jsQR = require('../vendor/jsqr.js');
const decodeJpeg = require('../vendor/jpeg-decoder.js');
const png = require('../vendor/pngjs/lib/png-sync.js');

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const MAX_PIXELS = 40 * 1024 * 1024;
const URL_PATTERN = /^(?:https?:\/\/|ftp:\/\/)\S+$/i;

/** @typedef {{ width: number, height: number, data: Uint8ClampedArray }} RgbaImage */

export class ImageDecodeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ImageDecodeError';
    this.code = code;
  }
}

/**
 * Identify a supported container from its first bytes.
 * @param {Uint8Array} buffer
 * @returns {'png' | 'jpeg' | undefined}
 */
export function sniffFormat(buffer) {
  if (buffer.length >= 8 && PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  return undefined;
}

/**
 * Decode a PNG or JPEG file into RGBA pixels.
 * @param {Uint8Array} buffer
 * @returns {RgbaImage & { format: 'png' | 'jpeg' }}
 */
export function decodeImageBuffer(source) {
  const buffer = Buffer.isBuffer(source) ? source : Buffer.from(source.buffer, source.byteOffset, source.byteLength);
  const format = sniffFormat(buffer);
  if (format === undefined) {
    throw new ImageDecodeError('unsupported_format', 'Only PNG and JPEG images are supported.');
  }
  try {
    if (format === 'png') {
      const image = png.read(buffer);
      return { format, width: image.width, height: image.height, data: asClamped(image.data) };
    }
    const image = decodeJpeg(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 512 });
    return { format, width: image.width, height: image.height, data: asClamped(image.data) };
  } catch (error) {
    throw new ImageDecodeError('invalid_image', `The ${format.toUpperCase()} image could not be decoded: ${messageOf(error)}`);
  }
}

/**
 * Find QR codes in RGBA pixels. The whole frame is tried first; only when that
 * finds nothing are overlapping quadrants scanned, so a picture with two codes
 * side by side still yields a result.
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @returns {{ texts: string[], ms: number }}
 */
export function decodeRgba(data, width, height) {
  const started = Date.now();
  checkRgba(data, width, height);
  /** @type {string[]} */
  const texts = [];
  const remember = (result) => {
    const text = result?.data;
    if (typeof text === 'string' && text.length > 0 && !texts.includes(text)) texts.push(text);
  };

  remember(jsQR(data, width, height, { inversionAttempts: 'attemptBoth' }));

  if (texts.length === 0 && width * height >= 160000) {
    for (const region of quadrants(width, height)) {
      const crop = cropRgba(data, width, region.x, region.y, region.width, region.height);
      remember(jsQR(crop, region.width, region.height, { inversionAttempts: 'attemptBoth' }));
      if (texts.length >= 4) break;
    }
  }

  return { texts, ms: Date.now() - started };
}

/**
 * Shape a detection for a caller that only needs one answer.
 * @param {{ texts: string[], ms: number }} decoded
 * @param {string} [format]
 */
export function describeResult(decoded, format) {
  const text = decoded.texts[0];
  if (text === undefined) return { ok: false, error: 'not_found', ms: decoded.ms };
  return {
    ok: true,
    text,
    kind: URL_PATTERN.test(text) ? 'url' : 'text',
    count: decoded.texts.length,
    texts: decoded.texts,
    format,
    ms: decoded.ms,
  };
}

function asClamped(data) {
  if (data instanceof Uint8ClampedArray) return data;
  return new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
}

function checkRgba(data, width, height) {
  if (!(data instanceof Uint8ClampedArray)) {
    throw new ImageDecodeError('bad_payload', 'Pixel data must be RGBA bytes.');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new ImageDecodeError('bad_dimensions', 'Image dimensions must be positive integers.');
  }
  if (width * height > MAX_PIXELS) {
    throw new ImageDecodeError('too_large', 'The image is too large to scan.');
  }
  if (data.length !== width * height * 4) {
    throw new ImageDecodeError('bad_payload', `Expected ${width * height * 4} RGBA bytes but received ${data.length}.`);
  }
}

/** 2x2 grid of slightly overlapping regions, wider than tall when the image is. */
function quadrants(width, height) {
  const overlapX = Math.round(width * 0.08);
  const overlapY = Math.round(height * 0.08);
  const halfWidth = Math.ceil(width / 2);
  const halfHeight = Math.ceil(height / 2);
  const regions = [];
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const x = Math.max(0, column * halfWidth - overlapX);
      const y = Math.max(0, row * halfHeight - overlapY);
      const right = Math.min(width, (column + 1) * halfWidth + overlapX);
      const bottom = Math.min(height, (row + 1) * halfHeight + overlapY);
      regions.push({ x, y, width: right - x, height: bottom - y });
    }
  }
  return regions;
}

function cropRgba(source, sourceWidth, x, y, width, height) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const from = ((y + row) * sourceWidth + x) * 4;
    out.set(source.subarray(from, from + width * 4), row * width * 4);
  }
  return out;
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}
