import { mount, type MountOptions } from '../src/playground.ts';
import { commonData, commonResolvers } from '../recipes/common.ts';
import { itPaData, itPaResolvers } from '../recipes/it-pa.ts';
import { CASES, COMMON_CASES } from './cases.ts';

const folding = (...entities: string[]) => (m: { entity: string }) => entities.includes(m.entity);

const BOOKS: Record<string, MountOptions> = {
  common: {
    data: commonData,
    resolvers: commonResolvers,
    cases: COMMON_CASES,
    fold: folding('reply', 'url', 'email', 'phone', 'ip', 'ticket', 'handle', 'hashtag'),
  },
  'it-pa': {
    data: itPaData,
    resolvers: itPaResolvers,
    cases: CASES,
    fold: folding('protocol', 'cig', 'cup', 'chapter', 'quotation'),
  },
};

const picker = document.querySelector<HTMLSelectElement>('#book')!;
const name = new URLSearchParams(location.search).get('book') ?? 'common';
picker.innerHTML = Object.keys(BOOKS).map((b) => `<option${b === name ? ' selected' : ''}>${b}</option>`).join('');
picker.addEventListener('change', () => (location.search = `?book=${encodeURIComponent(picker.value)}`));

mount(document.getElementById('app')!, BOOKS[name] ?? BOOKS.common);
