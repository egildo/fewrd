import { mount } from '../src/playground.ts';
import { itPaResolvers } from '../confs/it-pa.ts';
import { commonResolvers } from '../confs/common.ts';
import itPa from '../confs/it-pa.json' with { type: 'json' };
import common from '../confs/common.json' with { type: 'json' };
import itPaCases from '../cases/it-pa.json' with { type: 'json' };
import commonCases from '../cases/common.json' with { type: 'json' };

// Twenty-one cases, grouped by domain: thirteen Italian, then the eight common ones.
mount(document.getElementById('app')!, {
  confs: { 'it-pa': { conf: itPa, resolvers: itPaResolvers }, common: { conf: common, resolvers: commonResolvers } },
  cases: [...itPaCases, ...commonCases],
});
