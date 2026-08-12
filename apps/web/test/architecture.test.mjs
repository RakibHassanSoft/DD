import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(location);
    return /\.(ts|tsx)$/.test(entry.name) ? [location] : [];
  }));
  return files.flat();
}

test('frontend has one neutral API boundary and no backend source dependency', async () => {
  const files = await sourceFiles(path.join(webRoot, 'features'));
  const content = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  const combined = content.join('\n');
  const apiAdapterContent = content.filter((_source, index) => files[index].endsWith('.api.ts')).join('\n');

  assert.doesNotMatch(combined, /from\s+['"][^'"]*apps\/api/);
  assert.doesNotMatch(combined, /mongoose|googleapis|bullmq/);
  assert.doesNotMatch(apiAdapterContent, /from\s+['"][^'"]*auth\/auth\.api/);

  const client = await readFile(path.join(webRoot, 'lib', 'api-client.ts'), 'utf8');
  assert.match(client, /NEXT_PUBLIC_API_URL/);
  assert.match(client, /credentials:\s*'include'/);
  assert.match(client, /apiRequest/);
});
