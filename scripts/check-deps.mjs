// package.json と package-lock.json が「npm 公式レジストリの、完全一致で固定した版だけ」を指しているか確かめる。
// 依存を足したときに ^ 付きや git / tarball URL が紛れ込むのを CI で止めるためのもの。
import { readFileSync } from 'node:fs';

const REGISTRY = 'https://registry.npmjs.org/';
// `npm:<名前>@<版>` の別名も、版が完全一致なら認める
const EXACT =
  /^(npm:(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*@)?\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const errors = [];

for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (!EXACT.test(spec))
      errors.push(`package.json ${field}.${name}: "${spec}" は完全一致の版ではない`);
  }
}

for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '' || entry.link) continue;
  if (!entry.resolved?.startsWith(REGISTRY)) {
    errors.push(`${path}: 取得元が ${REGISTRY} ではない (${entry.resolved ?? 'なし'})`);
  }
  if (!entry.integrity?.startsWith('sha512-')) {
    errors.push(`${path}: sha512 の integrity がない`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`ok: ${Object.keys(lock.packages).length - 1} packages, all pinned to ${REGISTRY}`);
