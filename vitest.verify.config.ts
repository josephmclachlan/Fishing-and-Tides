// `npm run verify`: the live feed checks (scripts/verify), kept out of `npm test`, which must not touch the network.
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vite.config';

export default mergeConfig(base, defineConfig({ test: { include: ['scripts/verify/*.verify.ts'], testTimeout: 300_000 } }));
