import { randomInt } from 'crypto';

/**
 * Cryptographically Secure Fisher-Yates Shuffle
 * Guaranteed unbiased permutation with crypto.randomInt
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Roll a die with N sides (e.g. 20 for D20, 6 for D6, 2 for coin flip)
 */
export function secureRoll(sides: number): number {
  if (sides <= 1) return 1;
  return randomInt(1, sides + 1);
}
