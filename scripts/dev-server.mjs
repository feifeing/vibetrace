import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../web/', import.meta.url).pathname;
const port = Number(process.env.PORT || 4173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const safePath = normalize(pathname).replace(/^([.][.][/\\])+/, '');
    let filePath = join(root, safePath === '/' ? 'index.html' : safePath);
    const info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) filePath = join(filePath, 'index.html');
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': mime[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(root, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body);
  }
}).listen(port, () => {
  console.log(`VibeTrace running at http://localhost:${port}`);
});
