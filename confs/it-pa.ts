// Italian public administration: the codes users stuff into a document's
// «oggetto». The conf is data, in it-pa.json; only what can't be data lives here.

import { compile, type Conf, type Resolve } from '../src/index.ts';
import data from './it-pa.json' with { type: 'json' };

function isoDate(d: string): string | null {
  const m = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [day, month] = [Number(m[1]), Number(m[2])];
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export const itPaResolvers: Record<string, Resolve> = {
  protocol: (p) => p.value.match(/\d{7}/)?.[0] ?? null,
  cig: (p) => (/\p{L}/u.test(p.value) && /\d/.test(p.value) ? p.value : null),
  amount: (p) => {
    const number = p.value.match(/\d+(?:\.\d{3})*(?:,\d{1,2})?/)?.[0];
    if (number === undefined) return null;
    const [int, dec = ''] = number.split(',');
    return `${int.replace(/\./g, '')}.${dec.padEnd(2, '0')}`;
  },
  date: (p) => isoDate(p.value),
};

const { conf, errors } = compile(data, { resolvers: itPaResolvers });
if (errors.length) throw new Error(`it-pa.json: ${errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`);

export const itPa: Conf<RegExp, Resolve> = conf;
