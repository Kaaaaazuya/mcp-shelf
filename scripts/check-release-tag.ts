// リリースタグがデプロイしてよいものか確かめる（.github/workflows/release-deploy.yml から呼ぶ）。
// - タグ名は v + セマンティックバージョニング 2.0.0（例: v1.2.3、v1.2.3-rc.1）
// - 同じバージョンを指す別のタグがない（1.2.3 と v1.2.3、v1.2.3+a と v1.2.3+b は同じとみなす）
// - 同じバージョンの GitHub Release がまだない（Release はデプロイ済みの印。付け直しや再実行を止める）
// Node の型ストリップでそのまま動かすので、ほかのファイルを import しない。
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ID = '(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)';
const SEMVER = new RegExp(
  `^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(${ID}(?:\\.${ID})*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$`,
);

export type ReleaseVersion = { version: string; prerelease: boolean };

// v を外し、ビルドメタデータ（+ 以降）を除いたバージョンを返す。semver でなければ null
export function normalizeVersion(name: string): ReleaseVersion | null {
  const match = SEMVER.exec(name.replace(/^v/, ''));
  if (!match) return null;
  const [, major, minor, patch, pre] = match;
  return {
    version: `${major}.${minor}.${patch}${pre ? `-${pre}` : ''}`,
    prerelease: pre !== undefined,
  };
}

export function checkReleaseTag(
  tag: string,
  existingTags: string[],
  releaseTags: string[],
): { ok: true; version: string; prerelease: boolean } | { ok: false; errors: string[] } {
  if (!tag.startsWith('v') || !normalizeVersion(tag)) {
    return {
      ok: false,
      errors: [`タグ "${tag}" はセマンティックバージョニングではない（例: v1.2.3、v1.2.3-rc.1）`],
    };
  }
  const { version, prerelease } = normalizeVersion(tag)!;
  const errors: string[] = [];
  for (const other of existingTags) {
    if (other !== tag && normalizeVersion(other)?.version === version) {
      errors.push(`タグ "${other}" が同じバージョン ${version} を指している`);
    }
  }
  for (const released of releaseTags) {
    if (normalizeVersion(released)?.version === version) {
      errors.push(`バージョン ${version} はリリース "${released}" としてデプロイ済み`);
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, version, prerelease };
}

function lines(command: string, args: string[]): string[] {
  return execFileSync(command, args, { encoding: 'utf8' }).split('\n').filter(Boolean);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? '';
  const result = checkReleaseTag(
    tag,
    lines('git', ['tag', '--list']),
    // 下書きを含む全リリース。リポジトリは GH_REPO で指定する
    lines('gh', ['api', '--paginate', 'repos/{owner}/{repo}/releases', '--jq', '.[].tag_name']),
  );
  if (!result.ok) {
    console.error(result.errors.map((e) => `::error::${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`${tag} をバージョン ${result.version} としてデプロイする`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `prerelease=${result.prerelease}\n`);
  }
}
