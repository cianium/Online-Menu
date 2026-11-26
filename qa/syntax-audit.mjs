import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directories = ['js', 'admin', 'admin/vendor', 'backend', 'backend/lib', 'qa', 'supabase/functions'];

export function syntaxFailures() {
  const files = ['sw.js'];
  for (const directory of directories) {
    const dir = path.join(root, directory);
    const entries = readdirSync(dir, { withFileTypes: true, recursive: directory === 'supabase/functions' });
    for (const entry of entries) {
      if (entry.isFile() && /\.(?:[cm]?js|ts)$/.test(entry.name)) {
        files.push(path.relative(root, path.join(entry.parentPath, entry.name)));
      }
    }
  }
  const failures = [];
  for (const file of files.sort()) {
    const absolute = path.join(root, file);
    try {
      const isTypeScript = file.endsWith('.ts');
      const input = isTypeScript ? stripTypeScriptTypes(readFileSync(absolute, 'utf8')) : undefined;
      const args = isTypeScript ? ['--input-type=module', '--check'] : ['--check', absolute];
      const result = spawnSync(process.execPath, args, { input, encoding: 'utf8' });
      if (result.error) throw result.error;
      if (result.status !== 0) failures.push(`Syntax error in ${file}: ${result.stderr.trim()}`);
    } catch (error) {
      failures.push(`Syntax error in ${file}: ${error.message}`);
    }
  }
  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const failures = syntaxFailures();
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  }
}
