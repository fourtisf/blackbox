import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Vectors } from './vectors-gen.js';

export const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
export const loadVectors = (): Vectors =>
  JSON.parse(readFileSync(here('../vectors.json'), 'utf8')) as Vectors;
