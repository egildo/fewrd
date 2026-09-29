import { mount } from '../src/playground.ts';
import { itPaResolvers } from '../confs/it-pa.ts';
import conf from '../confs/it-pa.json' with { type: 'json' };
import cases from '../cases/it-pa.json' with { type: 'json' };

mount(document.getElementById('app')!, { conf, resolvers: itPaResolvers, cases });
