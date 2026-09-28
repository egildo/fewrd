// Italian public administration: the codes users stuff into a document's
// «oggetto». Labels vary wildly, values never do — so every anchor is strict
// and every label generous. Ported from sibardoc-prototype's subject fold.
//
// The recipes are data, in it-pa.json; only what can't be data lives here.

import { compile, type Book, type BookData, type Resolver } from '../src/index.ts';
import data from './it-pa.json' with { type: 'json' };

function isoDate(d: string): string | null {
  const m = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [day, month] = [Number(m[1]), Number(m[2])];
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const mixed = (v: string) => /\p{L}/u.test(v) && /\d/.test(v);

export const itPaResolvers: Record<string, Resolver> = {
  protocol: (p) => p.value.slice(0, 7),
  // Unlabelled, one letter and nine digits is a Co.Ge. account, not a CIG.
  cig: (p) => (mixed(p.value) && (p.label || !/^[A-Z]\d{9}$/.test(p.value)) ? p.value : null),
  amount: (p) => {
    if (!p.label && !p.unit) return null;
    const [int, dec = ''] = p.value.split(',');
    return `${int.replace(/\./g, '')}.${dec.padEnd(2, '0')}`;
  },
  date: (p) => isoDate(p.value),
};

export const itPaData: BookData = data;

const { book, errors } = compile(itPaData, { resolvers: itPaResolvers });
if (errors.length) throw new Error(`it-pa.json: ${errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`);

export const itPa: Book = book;
