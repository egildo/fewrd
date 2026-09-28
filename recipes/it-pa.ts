// Italian public administration: the codes users stuff into a document's
// «oggetto». Labels vary wildly, values never do — so every anchor is strict
// and every label generous. Ported from sibardoc-prototype's subject fold.

import type { Book, Recipe } from '../src/index.ts';

const DATE = String.raw`\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}`;

function isoDate(d: string): string | null {
  const m = d.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return null;
  const [day, month] = [Number(m[1]), Number(m[2])];
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const mixed = (v: string) => /\p{L}/u.test(v) && /\d/.test(v);

/** Words that label another entity — never part of a capitals tag. */
const LABEL_WORDS = String.raw`(?:C\.?I\.?G|C\.?U\.?P|P\.?C\.?F|C\.?D\.?R|PROT|PEC|CAP|CAPITOL[OI]|COD|CODICE|FORN|FORNITORE|IVA|EURO|ID|RIF|DEL)\.?(?![\p{L}])`;
const CAPS_WORD = String.raw`(?!${LABEL_WORDS})\p{Lu}(?:[.'&]?\p{Lu}){2,}\.?`;

export const protocol: Recipe = {
  entity: 'protocol',
  anchor: /\d{7}(?:\/\d{4})?/u,
  left: [
    { part: 'label', rx: /(?:Numero\s+Protocollo|Protocollo(?:\s+n[r°]?\.?)?|Prot\.?\s*(?:n[r°]?\.?)?|Rif\.?)\s*:?\s*/iu },
    { part: 'channel', rx: /(?:PEC|Posta\s+certificata|Riscontro\s+a)\s*[:\-]\s*/iu },
  ],
  right: [{ part: 'date', rx: new RegExp(String.raw`\s*,?\s*del\s+${DATE}`, 'iu') }],
  requires: ['label'],
  resolve: (p) => p.value.slice(0, 7),
};

export const cig: Recipe = {
  entity: 'cig',
  anchor: /[A-Z0-9]{10}/u,
  left: [{ part: 'label', rx: /C\.?I\.?G\.?(?:\s+(?:derivato|originario|master))?(?:\s*n\.)?\s*[:\-]?\s*/iu }],
  // Unlabelled, one letter and nine digits is a Co.Ge. account, not a CIG.
  resolve: (p) => (mixed(p.value) && (p.label || !/^[A-Z]\d{9}$/.test(p.value)) ? p.value : null),
};

export const cup: Recipe = {
  entity: 'cup',
  anchor: /[A-Z]\d{2}[A-Z0-9]{12}/u,
  left: [{ part: 'label', rx: /C\.?\s?U\.?\s?P\.?(?:\s+(?:derivato|master))?(?:\s*n\.)?\s*[:\-]?\s*/iu }],
};

export const chapter: Recipe = {
  entity: 'chapter',
  anchor: /[A-Z]{2}\d{2,3}\.\d{3,4}/u,
  left: [{ part: 'label', rx: /(?:Capitol[oi]|Cap\.?)(?:\s+di\s+(?:spesa|entrata))?\s*:?\s*/iu }],
};

export const amount: Recipe = {
  entity: 'amount',
  anchor: /\d+(?:\.\d{3})*(?:,\d{1,2})?/u,
  left: [{ part: 'label', rx: /(?:€|euro)\s*/iu }],
  right: [{ part: 'unit', rx: /\s*€/u }],
  resolve: (p) => {
    if (!p.label && !p.unit) return null;
    const [int, dec = ''] = p.value.split(',');
    return `${int.replace(/\./g, '')}.${dec.padEnd(2, '0')}`;
  },
};

export const date: Recipe = {
  entity: 'date',
  anchor: new RegExp(DATE, 'u'),
  resolve: (p) => isoDate(p.value),
};

export const caps: Recipe = {
  entity: 'caps',
  anchor: new RegExp(String.raw`${CAPS_WORD}(?: ${CAPS_WORD})+`, 'u'),
  weak: true,
};

/** From «con oggetto» to the end of its level, read again inside. */
export const quotation: Recipe = {
  entity: 'quotation',
  anchor: /con oggetto\s*:?\s*/iu,
  rest: true,
};

export const itPa: Book = {
  version: 'it-pa@1',
  recipes: [protocol, cig, cup, chapter, amount, date, caps, quotation],
};
