import base from '../../../../vitest.config.mjs';
export default { ...base, test: { ...base.test, include: ['docs/research/evidence/2026-09-30/*.probes.ts'] } };
