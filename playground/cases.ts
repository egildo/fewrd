// Subjects written the way the real ones are. Invented companies, real comuni.

import type { PlaygroundCase as Case } from '../src/playground.ts';

export type { Case };

export const CASES: Case[] = [
  {
    name: 'PEC, channel with a dash',
    text: 'Pec - Prot. n. 0023993 del 23/09/2026 - Misura 1.7.2 della missione 1, componente 1 del PNRR "Rete dei servizi di facilitazione digitale" - Comune di Ghilarza - CUP F84D26000210006 - Trasmissione cronoprogramma procedurale',
  },
  {
    name: 'PEC, channel with a colon',
    text: 'PEC: Prot. n. 0018842 del 12/09/2026 - Richiesta informazioni sullo stato della pratica di rimborso - Comune di Bosa',
  },
  {
    name: 'Riscontro',
    text: 'Riscontro a: Prot. n. 0020117 del 15/09/2026 - Istanza di accesso agli atti ai sensi degli artt. 22 e ss. della L. 241/1990',
  },
  {
    name: 'Gateway, two registers in capitals',
    text: 'Prot.N.0004821/2026 - RIF.0007730/2026 - POSTA CERTIFICATA: PROT. N. 0031002 DEL 19/09/2026 - RICHIESTA DI EROGAZIONE DEL SALDO - COMUNE DI ALGHERO',
  },
  {
    name: 'Ledger tail',
    text: 'Liquidazione fattura n. 45/2026 della ditta Sardatec S.r.l. - CIG Z1234ABCDE - Capitolo SC04.0123 - € 12.450,00',
  },
  {
    name: 'Brackets',
    text: 'Fornitura di toner per le stampanti degli uffici (CIG Z9A8B7C6D5) - saldo',
  },
  {
    name: 'Integration chain, nested quotations',
    text: 'Integrazione del provvedimento - Numero Protocollo 0012345 del 03/02/2026 con oggetto: Nota di Integrazione per il provvedimento con oggetto: Liquidazione LIQUIDAZIONE ATTIVA - CIG Z1234ABCDE',
  },
  {
    name: 'Short prose',
    text: 'Trasmissione prospetto quote associative 2026',
  },
];
