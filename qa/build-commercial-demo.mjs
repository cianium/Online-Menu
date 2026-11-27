/** Deterministic sample-only delivery package; no deployment or repository history. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, readdir, lstat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportDemo } from './export-demo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const dest=path.resolve(process.argv[2] || path.join(root,'dist','commercial-demo'));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD');
if(!/^[0-9a-f]{40}$/.test(sha)) throw Error('Invalid commit');
if(git('status','--porcelain','--untracked-files=no')) throw Error('Tracked source is dirty');
const inputs = ['admin', 'assets', 'css', 'js', 'index.html', 'manifest.webmanifest', 'sw.js'];
const publicTree = new Map();
for (const entry of git('ls-tree','-rz',sha,'--',...inputs).split('\0').filter(Boolean)) {
  const match = /^100(?:644|755) blob ([0-9a-f]{40})\t(.+)$/u.exec(entry);
  if (!match) throw Error('Unexpected entry in the public Git tree');
  publicTree.set(match[2], match[1]);
}
await mkdir(path.dirname(dest),{recursive:true});
const result=await exportDemo(root,dest,publicTree);
const launcher=await readFile(path.join(root,'qa/demo-server.mjs'),'utf8');
const oldRoot="new URL('..', import.meta.url)";
const oldFiles="['index.html', 'manifest.webmanifest', 'sw.js']";
if(launcher.split(oldRoot).length!==2 || launcher.split(oldFiles).length!==2) throw Error('Unexpected preview server source');
await writeFile(path.join(dest,'start.mjs'),launcher.replace(oldRoot,"new URL('./public/', import.meta.url)").replace(oldFiles,"['index.html', 'manifest.webmanifest', 'sw.js', 'robots.txt']"),{flag:'wx'});
await writeFile(path.join(dest,'START-HERE.md'),await readFile(path.join(root,'docs/COMMERCIAL_DEMO_GUIDE.md')),{flag:'wx'});
await writeFile(path.join(dest,'VERSION.json'),JSON.stringify({schema:1,milestone:'R16',channel:'candidate',sourceCommit:sha,sourceTree:git('rev-parse',sha+'^{tree}'),mode:'standalone-sample-only',publicFiles:result.files},null,2)+'\n',{flag:'wx'});
const files=[];
async function walk(dir){
 for(const name of (await readdir(path.join(dest,dir))).sort()){
  const rel=path.posix.join(dir,name),full=path.join(dest,rel),st=await lstat(full);
  if(st.isSymbolicLink()) throw Error('Unexpected link: '+rel);
  if(st.isDirectory()) await walk(rel);
  else if(st.isFile()) files.push(createHash('sha256').update(await readFile(full)).digest('hex')+'  '+rel);
  else throw Error('Unexpected file: '+rel);
 }
}
await walk('');
await writeFile(path.join(dest,'PACKAGE-SHA256SUMS'),files.sort((a,b)=>a.slice(66).localeCompare(b.slice(66),'en')).join('\n')+'\n',{flag:'wx'});
console.log('RELEASE PACKAGE '+JSON.stringify({sourceCommit:sha,publicFiles:result.files,packageFiles:files.length+1}));
