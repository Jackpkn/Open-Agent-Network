/**
 * USDC amounts, handled as integer micro-units (6 decimals, matching the token).
 *
 * Money is never held in a float. `0.1 + 0.2` problems in a ledger show up as
 * balances that drift by a cent a month and are impossible to reconcile.
 */

const SCALE = 1_000_000;

export type Micros = number;

export function parseUsdc(value: string | number | null | undefined): Micros {
  if (value === null || value === undefined || value === '') return 0;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error(`"${value}" is not a valid USDC amount`);
  }
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const micros = Number(whole) * SCALE + Number((fraction + '000000').slice(0, 6));
  return negative ? -micros : micros;
}

export function formatUsdc(micros: Micros): string {
  const negative = micros < 0;
  const abs = Math.abs(Math.round(micros));
  const whole = Math.floor(abs / SCALE);
  const fraction = String(abs % SCALE).padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

/** Split a payment into worker share and protocol fee. Fee rounds toward the protocol. */
export function splitFee(amount: Micros, feeBps: number): { worker: Micros; fee: Micros } {
  const fee = Math.floor((amount * feeBps) / 10_000);
  return { worker: amount - fee, fee };
}
