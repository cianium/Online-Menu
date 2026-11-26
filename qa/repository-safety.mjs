// Narrow guard for the repository's existing Actions policy; not a general YAML parser.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const dir = new URL('../.github/workflows/', import.meta.url);
const files = readdirSync(dir).filter(f=>/\.ya?ml$/.test(f)).sort();
const manualRelease = 'release-vq3.yml';
assert.ok(files.includes(manualRelease));
for(const name of files){
  const source=readFileSync(new URL(name,dir),'utf8');
  assert.doesNotMatch(source,/^\s*pull_request_target\s*:/m,name+' privileged PR trigger');
  if(name===manualRelease){
    const trigger=source.match(/^on:\s*\n([\s\S]*?)(?=^\S)/m)?.[1]||'';
    assert.equal(trigger.trim(),'workflow_dispatch:',name+' must remain manual only');
    assert.match(source,/if: github\.ref == 'refs\/heads\/main'/,name);
    assert.match(source,/^permissions:\n  contents: write\s*\n/m);
  }else{
    assert.match(source,/^permissions:\n  contents: read\s*\n/m,name);
    assert.doesNotMatch(source,/^\s*[a-z-]+:\s*write\s*$/m,name+' write permission');
    const checkout=source.match(/^\s*- uses: actions\/checkout@[^\n]+\n(?:^(?!\s*- |\S)[^\n]*\n)*/gm)||[];
    for(const block of checkout) assert.match(block,/persist-credentials: false/,name+' checkout stores token');
    assert.doesNotMatch(source,/\$\{\{\s*secrets\./,name+' secret in read-only workflow');
  }
  console.log('WORKFLOW POLICY PASS '+name);
}
console.log('REPOSITORY POLICY SUMMARY '+JSON.stringify({workflows:files.length,manualWriteExceptions:1}));
