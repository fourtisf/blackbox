// Bundles the protocol for the browser and runs the golden vectors in headless Chromium.
// platform: 'browser' makes the build fail if anything in src imports a Node built-in.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../test/browser-entry.ts', import.meta.url));
const bundle = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'protocolCheck',
  platform: 'browser',
  target: 'es2020',
  logLevel: 'silent',
});
const code = bundle.outputFiles[0].text;

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (e) {
  skip(`playwright is not installed (${e.message})`);
}
let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  skip(
    `Chromium is not available (${e.message.split('\n')[0]}). Install it with: pnpm --filter protocol exec playwright install chromium`,
  );
}

try {
  const page = await browser.newPage();
  const result = await page.evaluate(`${code}\nprotocolCheck.run()`);
  if (result.failures.length) {
    console.error(`browser check: ${result.failures.length} of ${result.checks} checks failed`);
    for (const f of result.failures) console.error('  ' + f);
    process.exitCode = 1;
  } else {
    console.log(
      `browser check: all ${result.checks} vector checks passed in ${result.userAgent.match(/(Headless)?Chrome\/[\d.]+/)?.[0] ?? 'Chromium'} (bundle ${(code.length / 1024).toFixed(1)} KB)`,
    );
  }
} finally {
  await browser.close();
}

function skip(reason) {
  if (process.env.CI) {
    console.error(`browser check failed: ${reason}`);
    process.exit(1);
  }
  console.warn(`browser check SKIPPED: ${reason}`);
  process.exit(0);
}
