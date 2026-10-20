import type { CardInstance } from '../types/card.js';

export interface CardPTInfo {
  hasPT: boolean;
  baseP: number | '*' | null;
  baseT: number | '*' | null;
  effectiveP: number | '*';
  effectiveT: number | '*';
  pStatus: 'up' | 'down' | 'neutral';
  tStatus: 'up' | 'down' | 'neutral';
  overallStatus: 'up' | 'down' | 'neutral';
  text: string;
}

/**
 * Calcula el poder y resistencia (P/T) efectivo de una carta en mesa:
 * efectivo = base + contadores +1/+1 - contadores -1/-1
 * Permite valores 0 y negativos sin motor de reglas.
 * Para cartas con '*' o expresiones en P/T, muestra '*' hasta que el jugador defina un valor base numérico.
 */
export function computeCardPT(card: CardInstance): CardPTInfo | null {
  const plusCounters = card.counters?.['+1/+1'] || 0;
  const minusCounters = (card.counters?.['-1/-1'] || 0) + (card.counters?.['−1/−1'] || 0);
  const delta = plusCounters - minusCounters;

  let baseP: number | '*' | null = null;
  if (card.basePower !== undefined) {
    baseP = card.basePower;
  } else if (card.definition?.power !== undefined) {
    const pStr = String(card.definition.power).trim();
    if (pStr.includes('*') || pStr.includes('?')) {
      baseP = '*';
    } else {
      const parsed = parseInt(pStr, 10);
      baseP = isNaN(parsed) ? '*' : parsed;
    }
  }

  let baseT: number | '*' | null = null;
  if (card.baseToughness !== undefined) {
    baseT = card.baseToughness;
  } else if (card.definition?.toughness !== undefined) {
    const tStr = String(card.definition.toughness).trim();
    if (tStr.includes('*') || tStr.includes('?')) {
      baseT = '*';
    } else {
      const parsed = parseInt(tStr, 10);
      baseT = isNaN(parsed) ? '*' : parsed;
    }
  }

  if (baseP === null && baseT === null) {
    return null;
  }

  let effectiveP: number | '*' = '*';
  let pStatus: 'up' | 'down' | 'neutral' = 'neutral';
  if (typeof baseP === 'number') {
    effectiveP = baseP + delta;
    if (effectiveP > baseP) pStatus = 'up';
    else if (effectiveP < baseP) pStatus = 'down';
  }

  let effectiveT: number | '*' = '*';
  let tStatus: 'up' | 'down' | 'neutral' = 'neutral';
  if (typeof baseT === 'number') {
    effectiveT = baseT + delta;
    if (effectiveT > baseT) tStatus = 'up';
    else if (effectiveT < baseT) tStatus = 'down';
  }

  let overallStatus: 'up' | 'down' | 'neutral' = 'neutral';
  if ((pStatus === 'up' || tStatus === 'up') && pStatus !== 'down' && tStatus !== 'down') {
    overallStatus = 'up';
  } else if ((pStatus === 'down' || tStatus === 'down') && pStatus !== 'up' && tStatus !== 'up') {
    overallStatus = 'down';
  } else if (pStatus === 'up' && tStatus === 'down') {
    overallStatus = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
  }

  return {
    hasPT: true,
    baseP,
    baseT,
    effectiveP,
    effectiveT,
    pStatus,
    tStatus,
    overallStatus,
    text: `${effectiveP}/${effectiveT}`,
  };
}
