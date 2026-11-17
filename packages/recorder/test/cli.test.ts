import { readFileSync } from 'node:fs';
import { leafHash, recordHash } from '@blackbox/protocol';
import type { Hex } from '@blackbox/protocol';
import vectors from '@blackbox/protocol/vectors.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { COMMANDS, run, VERSION } from '../src/cli.js';

const capture = (argv: string[]) => {
  const out: string[] = [];
  const err: string[] = [];
  const code = run(
    argv,
    (s) => out.push(s),
    (s) => err.push(s),
  );
  return { code, out: out.join('\n'), err: err.join('\n') };
};

describe('blackbox CLI', () => {
  it('--help lists every command from docs/03-RECORDER.md', () => {
    const r = capture(['--help']);
    expect(r.code).toBe(0);
    for (const name of ['init', 'status', 'wrap', 'mode', 'reveal', 'ui', 'alerts', 'uninstall']) {
      expect(r.out).toMatch(new RegExp(`^  ${name} `, 'm'));
    }
    expect(r.out).toContain('seal protocol v1');
    expect(capture([]).out).toBe(r.out);
  });

  it('--version matches package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(capture(['--version'])).toMatchObject({ code: 0, out: pkg.version });
    expect(VERSION).toBe(pkg.version);
  });

  it('known commands say they are not built yet', () => {
    for (const [name] of COMMANDS)
      expect(capture([name])).toMatchObject({ code: 2, err: expect.stringContaining('Milestone 3') });
  });

  it('unknown commands fail with help', () => {
    const r = capture(['frobnicate']);
    expect(r.code).toBe(1);
    expect(r.err).toContain('Unknown command: frobnicate');
  });
});

describe('protocol vectors from the recorder package', () => {
  it('produces the same leaves the API, browser and contracts check', () => {
    for (const r of vectors.records) {
      expect(recordHash(r.record)).toBe(r.recordHash);
      expect(leafHash(r.salt as Hex, r.recordHash as Hex)).toBe(r.leaf);
    }
  });
});
