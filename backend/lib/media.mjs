import crypto from 'node:crypto';
import { httpError } from './http.mjs';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURES = [
  { mime: 'image/jpeg', ext: 'jpg', test: b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: 'png', test: b => b.length > 8 && b.subarray(0, 8).equals(PNG) },
  { mime: 'image/webp', ext: 'webp', test: b => b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' }
];

/**
 * Decode and validate an image sent as a base64 data URL.
 * The declared MIME type is never trusted: the file signature must match it.
 * SVG is intentionally not accepted (script-capable format).
 */
export function parseImageDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(value ?? ''));
  if (!match) throw httpError(400, 'Image must be a JPEG, PNG or WebP data URL.', 'INVALID_IMAGE');
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw httpError(400, 'Image is empty.', 'INVALID_IMAGE');
  if (buffer.length > MAX_IMAGE_BYTES) throw httpError(413, 'Image is larger than 2 MB.', 'IMAGE_TOO_LARGE');
  const signature = SIGNATURES.find(item => item.test(buffer));
  if (!signature || signature.mime !== match[1]) throw httpError(415, 'Image content does not match its declared type.', 'INVALID_IMAGE');
  return { buffer, mime: signature.mime, ext: signature.ext };
}

export const randomImageName = ext => `${crypto.randomUUID()}.${ext}`;
