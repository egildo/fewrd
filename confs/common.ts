// Things that recur in any inbox, chat or ticket, whatever the language:
// links, addresses, phones, IPs, ISO dates, money, percentages, versions,
// ticket keys, @handles, #hashtags, Re:/Fwd: chains and quoted replies.
//
// The conf is data, in common.json; only what can't be data lives here, and
// mostly it says no: a look-alike that isn't the real thing resolves to null.

import { compile, type Conf, type Resolve } from '../src/index.ts';
import data from './common.json' with { type: 'json' };

const CURRENCY: Record<string, string> = { $: 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' };

export const commonResolvers: Record<string, Resolve> = {
  lower: (p) => p.value.toLowerCase(),
  // E.164: at most 15 digits, and fewer than 8 is a code, not a phone.
  phone: (p) => {
    const digits = p.value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  },
  ipv4: (p) => (p.value.split('.').every((o) => Number(o) <= 255) ? p.value : null),
  datetime: (p) => {
    const [date, time] = p.value.split(/[T ]/);
    const [, month, day] = date.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return time ? `${date}T${time}` : date;
  },
  // 1,250.00 · 1.250,00 · 89,90 → a dot decimal; the currency → its code.
  money: (p) => {
    const currency = p.currency.trim();
    const [, int, dec = ''] = p.value.replace(p.currency, '').trim().match(/^(.*?)(?:[.,](\d{1,2}))?$/)!;
    return `${int.replace(/[.,]/g, '')}.${dec.padEnd(2, '0')} ${CURRENCY[currency] ?? currency.toUpperCase()}`;
  },
};

const { conf, errors } = compile(data, { resolvers: commonResolvers });
if (errors.length) throw new Error(`common.json: ${errors.map((e) => `${e.path}: ${e.message}`).join('; ')}`);

export const common: Conf<RegExp, Resolve> = conf;
