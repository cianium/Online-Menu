/** Local-only preview of the public menu and admin demo; never proxies an API. */
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.DEMO_PORT ?? 8765);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid DEMO_PORT');
const rootFiles = new Set(['index.html', 'manifest.webmanifest', 'sw.js']);
const folders = new Set(['admin', 'assets', 'css', 'js']);
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Referrer-Policy', 'no-referrer');
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
    const data = await readFile(file);
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
