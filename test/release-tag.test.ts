import { describe, expect, it } from 'vitest';
import { checkReleaseTag, normalizeVersion } from '../scripts/check-release-tag';

describe('normalizeVersion', () => {
  it('v とビルドメタデータを外す', () => {
    expect(normalizeVersion('v1.2.3')).toEqual({ version: '1.2.3', prerelease: false });
    expect(normalizeVersion('1.2.3+build.5')).toEqual({ version: '1.2.3', prerelease: false });
    expect(normalizeVersion('v1.2.3-rc.1')).toEqual({ version: '1.2.3-rc.1', prerelease: true });
  });

  it('semver でなければ null', () => {
    for (const name of ['v1.2', 'v01.2.3', 'v1.2.3-01', 'release-1', 'v1.2.3.4', 'latest']) {
      expect(normalizeVersion(name)).toBeNull();
    }
  });
});

describe('checkReleaseTag', () => {
  it('新しいバージョンなら通す', () => {
    expect(checkReleaseTag('v1.1.0', ['v1.0.0', 'v1.1.0'], ['v1.0.0'])).toEqual({
      ok: true,
      version: '1.1.0',
      prerelease: false,
    });
  });

  it('プレリリースは prerelease を立てる', () => {
    expect(checkReleaseTag('v2.0.0-beta.1', ['v2.0.0-beta.1'], [])).toMatchObject({
      ok: true,
      prerelease: true,
    });
  });

  it('v で始まらないタグや semver でないタグはエラー', () => {
    for (const tag of ['1.2.3', 'v1.2', 'deploy']) {
      expect(checkReleaseTag(tag, [tag], [])).toMatchObject({ ok: false });
    }
  });

  it('同じバージョンを指す別のタグがあればエラー', () => {
    for (const other of ['1.2.3', 'v1.2.3+other']) {
      expect(checkReleaseTag('v1.2.3', ['v1.2.3', other], [])).toMatchObject({ ok: false });
    }
    expect(checkReleaseTag('v1.2.3+b', ['v1.2.3+a', 'v1.2.3+b'], [])).toMatchObject({ ok: false });
  });

  it('同じバージョンのリリースがあればエラー（再実行やタグの付け直し）', () => {
    expect(checkReleaseTag('v1.2.3', ['v1.2.3'], ['v1.2.3'])).toMatchObject({ ok: false });
  });

  it('プレリリースと正式版は別のバージョン', () => {
    expect(checkReleaseTag('v1.2.3', ['v1.2.3-rc.1', 'v1.2.3'], ['v1.2.3-rc.1'])).toMatchObject({
      ok: true,
    });
  });
});
