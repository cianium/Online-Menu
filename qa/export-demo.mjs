/** Build an isolated static demo bundle. Never deploys or modifies source files. */
import { createHash } from 'node:crypto';
import { mkdir, readdir, lstat, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ROOT_FILES = ['index.html', 'manifest.webmanifest', 'sw.js'];
const PUBLIC_DIRS = ['admin', 'assets', 'css', 'js'];
const EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.txt']);

function demoDocument(html, customer) {
  const end = '</head>';
  let result = html;
  if (customer) {
    const robots = '<meta name="robots" content="index, follow">';
    if (result.split(robots).length !== 2) throw new Error('Unexpected customer robots metadata');
    result = result.replace(robots, '<meta name="robots" content="noindex, nofollow">');
  }
  if (result.split(end).length !== 2) throw new Error('Unexpected document head');
  return result.replace(end, '    <meta name="online-menu-mode" content="standalone">\n' + end);
}

export async function exportDemo(source, destination, publicTree) {
  const root = await realpath(source);
  const output = path.resolve(destination);
  // Resolve the existing parent, not a new path through an untrusted symlink.
  const parent = await realpath(path.dirname(output));
  const target = path.join(parent, path.basename(output));
  if (target === root || root.startsWith(target + path.sep) || PUBLIC_DIRS.some(dir => target === path.join(root,dir) || target.startsWith(path.join(root,dir) + path.sep))) {
    throw new Error('Output must not replace or be inside a public source directory');
  }
  // Exclusive creation: never overwrite or recursively delete an existing directory.
  await mkdir(target);
  try {
    const web = path.join(target,'public');
    await mkdir(web);
    const hashes = [];
    async function copy(relative) {
      const src = path.join(root,relative);
      const info = await lstat(src);
      if (info.isSymbolicLink()) throw new Error(`Symlink refused: ${relative}`);
      if (info.isDirectory()) {
        await mkdir(path.join(web,relative));
        for (const name of (await readdir(src)).sort()) {
          if (name.startsWith('.') || /[\r\n\\]/.test(name)) throw new Error(`Unexpected public path: ${relative}/${name}`);
          await copy(`${relative}/${name}`);
        }
        return;
      }
      if (!info.isFile() || (!ROOT_FILES.includes(relative) && !EXTENSIONS.has(path.extname(relative).toLowerCase()))) throw new Error(`Unexpected public file: ${relative}`);
      let bytes = await readFile(src);
      if (publicTree) {
        const expected = publicTree.get(relative);
        if (!expected) throw new Error('Untracked public file: '+relative);
        const actual = createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
        if (actual !== expected) throw new Error('Public file differs from source commit: '+relative);
      }
      // The private export must not be indexed or persist protected pages in a PWA cache.
      if (relative === 'index.html' || relative === 'admin/index.html') {
        bytes = Buffer.from(demoDocument(bytes.toString('utf8'), relative === 'index.html'));
      } else if (relative === 'sw.js') {
        bytes = await readFile(new URL('./private-demo-sw.js', import.meta.url));
      }
      await writeFile(path.join(web,relative),bytes,{flag:'wx'});
      hashes.push(`${createHash('sha256').update(bytes).digest('hex')}  ${relative}`);
    }
    for (const name of ROOT_FILES) {
      if (!(await lstat(path.join(root,name))).isFile()) throw new Error(`Expected regular root file: ${name}`);
      await copy(name);
    }
    for (const name of PUBLIC_DIRS) {
      if (!(await lstat(path.join(root,name))).isDirectory()) throw new Error(`Expected public directory: ${name}`);
      await copy(name);
    }
    if (publicTree && hashes.length !== publicTree.size) throw new Error('Incomplete public source tree');
    // Demo must not be indexed. This is guidance, not authentication.
    const robots = Buffer.from('User-agent: *\nDisallow: /\n');
    await writeFile(path.join(web,'robots.txt'),robots,{flag:'wx'});
    hashes.push(`${createHash('sha256').update(robots).digest('hex')}  robots.txt`);
    await writeFile(path.join(target,'SHA256SUMS'),hashes.sort((a,b)=>a.slice(66).localeCompare(b.slice(66),'en')).join('\n')+'\n',{flag:'wx'});
    return {target, files:hashes.length};
  } catch (error) {
    await rm(target,{recursive:true,force:true});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const defaultParent = path.join(ROOT,'dist');
  if (!process.argv[2]) await mkdir(defaultParent,{recursive:true});
  const result = await exportDemo(ROOT,process.argv[2] || path.join(defaultParent,'demo'));
  console.log(`Exported ${result.files} public files to ${result.target}/public (not deployed)`);
}
