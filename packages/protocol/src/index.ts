/**
 * Blackbox seal protocol. The single implementation of every hash the product
 * relies on; recorder, API, indexer and web all import it from here.
 * Any change that alters an output must bump PROTOCOL_VERSION and regenerate vectors.json.
 */
export const PROTOCOL_VERSION = 1;

export * from './bytes.js';
export * from './canonical.js';
export * from './record.js';
export * from './hash.js';
export * from './merkle.js';
export * from './eip712.js';
export * from './verify.js';
