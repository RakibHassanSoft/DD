import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const location = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(location);
    return entry.name.endsWith('.ts') ? [location] : [];
  }));
  return files.flat();
}

test('backend is independent of the Next.js frontend and exposes API-prefixed routes', async () => {
  const files = await sourceFiles(path.join(apiRoot, 'src'));
  const source = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /apps\/web|from\s+['"][^'"]*(next|react)/);

  const appSource = await readFile(path.join(apiRoot, 'src', 'app.ts'), 'utf8');
  const mounts = [...appSource.matchAll(/app\.use\('([^']+)'/g)].map((match) => match[1]);
  assert.ok(mounts.length > 0);
  assert.ok(mounts.every((mount) => mount.startsWith('/api')));
});

test('Phase 8: manual Render/Netlify deployment and operational safeguards are configured', async () => {
  const workspaceRoot = path.resolve(apiRoot, '..', '..');
  const [appSource, cookieSource, renderBlueprint, dockerfile, dockerignore, netlifyConfig, runbook] = await Promise.all([
    readFile(path.join(apiRoot, 'src', 'app.ts'), 'utf8'),
    readFile(path.join(apiRoot, 'src', 'common', 'utils', 'jwt.ts'), 'utf8'),
    readFile(path.join(workspaceRoot, 'render.yaml'), 'utf8'),
    readFile(path.join(apiRoot, 'Dockerfile'), 'utf8'),
    readFile(path.join(workspaceRoot, '.dockerignore'), 'utf8'),
    readFile(path.join(workspaceRoot, 'netlify.toml'), 'utf8'),
    readFile(path.join(workspaceRoot, 'docs', 'production-deployment.md'), 'utf8')
  ]);

  assert.match(appSource, /helmet\(/);
  assert.match(appSource, /\/api\/health\/live/);
  assert.match(appSource, /\/api\/health\/ready/);
  assert.match(appSource, /database\.admin\(\)\.ping\(\)/);
  assert.match(cookieSource, /'none'/);
  assert.match(renderBlueprint, /healthCheckPath: \/api\/health\/ready/);
  assert.match(renderBlueprint, /autoDeployTrigger: "off"/);
  assert.match(renderBlueprint, /type: worker/);
  assert.match(dockerfile, /CMD \["node", "apps\/api\/dist\/server\.js"\]/);
  assert.match(renderBlueprint, /dockerCommand: node apps\/api\/dist\/worker\.js/);
  assert.match(dockerignore, /^\.env$/m);
  assert.match(netlifyConfig, /@mailflow\/web/);
  assert.match(runbook, /manual/i);
});
