import { mount } from '../src/playground.ts';
import { itPa } from '../recipes/it-pa.ts';
import { CASES } from './cases.ts';

mount(document.getElementById('app')!, {
  book: itPa,
  cases: CASES,
  fold: (m) => ['protocol', 'cig', 'cup', 'chapter', 'quotation'].includes(m.entity),
});
