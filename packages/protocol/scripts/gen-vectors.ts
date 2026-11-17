import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildVectors } from '../test/vectors-gen.js';

const out = fileURLToPath(new URL('../vectors.json', import.meta.url));
writeFileSync(out, JSON.stringify(buildVectors(), null, 2) + '\n');
console.log(`wrote ${out}`);
