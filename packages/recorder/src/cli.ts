#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION } from '@blackbox/protocol';

export const VERSION = '0.1.0';

/** Commands from docs/03-RECORDER.md. They are built in Milestone 3. */
export const COMMANDS: [name: string, summary: string][] = [
  ['init', 'Find your agent apps, wrap their trading MCP servers and create the sealer key'],
  ['status', 'Agent id, wallet, mode, reveal policy, last seal, queue size and RPC health'],
  ['wrap', 'MCP proxy entry point that init writes into agent configs (not run by hand)'],
  ['mode', 'Set enforcement: strict or lenient (default lenient)'],
  ['reveal', 'Set reveal policy: private, delayed or public (default delayed, 24h)'],
  ['ui', 'Local replay dashboard on 127.0.0.1'],
  ['alerts', 'Connect Telegram alerts'],
  ['uninstall', 'Restore every backed-up config exactly'],
];

const help = () =>
  [
    `blackbox ${VERSION} (seal protocol v${PROTOCOL_VERSION})`,
    'The flight recorder for AI trading agents.',
    '',
    'Usage: blackbox <command> [options]',
    '',
    'Commands:',
    ...COMMANDS.map(([n, s]) => `  ${n.padEnd(10)} ${s}`),
    '',
    'Options:',
    '  -h, --help     Show this help',
    '  -v, --version  Show the version',
  ].join('\n');

export function run(
  argv: string[],
  out: (s: string) => void = console.log,
  err: (s: string) => void = console.error,
): number {
  const [cmd] = argv;
  if (!cmd || cmd === '-h' || cmd === '--help' || cmd === 'help') {
    out(help());
    return 0;
  }
  if (cmd === '-v' || cmd === '--version') {
    out(VERSION);
    return 0;
  }
  if (COMMANDS.some(([n]) => n === cmd)) {
    err(`blackbox ${cmd} is not available yet. It ships with the recorder (Milestone 3).`);
    return 2;
  }
  err(`Unknown command: ${cmd}\n\n${help()}`);
  return 1;
}

const invokedDirectly = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exitCode = run(process.argv.slice(2));
