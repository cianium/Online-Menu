/** Local-only preview of the public menu and admin demo; never proxies an API. */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const compress = promisify(gzip);
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.DEMO_PORT ?? 8765);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid DEMO_PORT');
const rootFiles = new Set(['index.html', 'manifest.webmanifest', 'sw.js']);
const folders = new Set(['admin', 'assets', 'css', 'js']);
const csp = [
  "default-src 'self'", "base-uri 'self'", "connect-src 'self'", "font-src 'self'",
  "form-action 'self'", "frame-ancestors 'none'", "img-src 'self' data: blob: https:",
  "manifest-src 'self'", "object-src 'none'", "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", "worker-src 'self'"
].join('; ');
const mime = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8'
}));
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  const finish = status => { res.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'}); res.end(); };
  const authority = req.headers.host;
  const listeningPort = server.address().port;
  if (authority !== `127.0.0.1:${listeningPort}` && authority !== `localhost:${listeningPort}`) return finish(421);
  if (req.method !== 'GET' && req.method !== 'HEAD') return finish(405);
  try {
    const raw = (req.url ?? '').split('?')[0];
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || /[\\\0]/.test(decoded)) return finish(400);
    const parts = decoded.split('/').filter(Boolean);
    if (parts.some(part => part.startsWith('.'))) return finish(404);
    if (parts.length === 0) parts.push('index.html');
    if (parts.length === 1 && parts[0] === 'admin') {
      if (!decoded.endsWith('/')) { res.writeHead(308, {Location: '/admin/'}); return res.end(); }
      parts.push('index.html');
    }
    if (!(parts.length === 1 && rootFiles.has(parts[0])) && !folders.has(parts[0])) return finish(404);
    const type = mime.get(path.extname(parts.at(-1)).toLowerCase());
    if (!type) return finish(404);
    const file = await realpath(path.join(root, ...parts));
    // Refuse symlinks escaping the requested public path (including other project directories).
    if (file !== path.join(root, ...parts) || !(await stat(file)).isFile()) return finish(404);
    let data = await readFile(file);
    if (data.length >= 1024 && (type.includes('charset=utf-8') || type === 'image/svg+xml')) {
      res.setHeader('Vary', 'Accept-Encoding');
      const acceptsGzip = (req.headers['accept-encoding'] || '').split(',').some(token => {
        const match = /^\s*gzip\s*(?:;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?\s*$/i.exec(token);
        return match && (match[1] === undefined || Number(match[1]) > 0);
      });
      if (acceptsGzip) {
        data = await compress(data);
        res.setHeader('Content-Encoding', 'gzip');
      }
    }
    res.writeHead(200, {'Content-Type': type, 'Content-Length': data.length});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    return finish(error instanceof URIError ? 400 : error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500);
  }
});
server.listen(port, '127.0.0.1', () => {
  const listeningPort = server.address().port;
  console.log(`Demo (local only): http://127.0.0.1:${listeningPort}/ and http://127.0.0.1:${listeningPort}/admin/`);
});
