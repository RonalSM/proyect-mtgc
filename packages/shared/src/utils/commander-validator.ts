import { CardDefinition, CardColor } from '../types/card.js';

const BASIC_LANDS = new Set([
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Wastes',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
]);

const UNLIMITED_COPIES_CARDS = new Set([
  'Relentless Rats',
  'Shadowborn Apostle',
  'Rat Colony',
  'Persistent Petitioners',
  "Dragon's Approach",
  'Slime Against Humanity',
  'Hare Apparent',
]);

export interface DeckCardWithQuantity {
  card: CardDefinition;
  quantity: number;
  isCommander: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  totalCards: number;
  commanderCount: number;
  commanderColorIdentity: CardColor[];
  errors: string[];
  warnings: string[];
}

/**
 * Validates a deck against MTG Commander rules
 */
export function validateCommanderDeck(
  commanderCards: DeckCardWithQuantity[],
  maindeckCards: DeckCardWithQuantity[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const commanderTotal = commanderCards.reduce((sum, c) => sum + c.quantity, 0);
  const maindeckTotal = maindeckCards.reduce((sum, c) => sum + c.quantity, 0);
  const totalCards = commanderTotal + maindeckTotal;

  // 1. Commander count check
  if (commanderTotal === 0) {
    errors.push('El mazo debe tener al menos un comandante.');
  } else if (commanderTotal > 2) {
    errors.push(
      `El mazo tiene ${commanderTotal} comandantes (máximo permitido: 2 con Partner/Background/Friends Forever).`,
    );
  }

  // 2. Total deck size check (must be exactly 100)
  if (totalCards !== 100) {
    errors.push(`El mazo debe contener exactamente 100 cartas (actual: ${totalCards}).`);
  }

  // 3. Compute Commander combined color identity
  const commanderColorSet = new Set<CardColor>();
  for (const cmd of commanderCards) {
    for (const color of cmd.card.colorIdentity) {
      commanderColorSet.add(color);
    }
  }
  const commanderColorIdentity = Array.from(commanderColorSet);

  // 4. Singleton and Color Identity checks
  const cardCounts = new Map<string, number>();

  const allCards = [...commanderCards, ...maindeckCards];
  for (const item of allCards) {
    const card = item.card;
    const currentCount = cardCounts.get(card.name) || 0;
    cardCounts.set(card.name, currentCount + item.quantity);

    // Color identity check
    const invalidColors = card.colorIdentity.filter(c => !commanderColorSet.has(c));
    if (invalidColors.length > 0 && !item.isCommander) {
      errors.push(
        `"${card.name}" contiene identidad de color [${invalidColors.join(', ')}] no permitida por el comandante [${commanderColorIdentity.join(', ') || 'Incoloro'}].`,
      );
    }
  }

  // Check singleton violations
  for (const [name, count] of cardCounts.entries()) {
    if (BASIC_LANDS.has(name) || UNLIMITED_COPIES_CARDS.has(name)) {
      continue;
    }

    if (name === 'Seven Dwarves' && count <= 7) {
      continue;
    }

    if (count > 1) {
      errors.push(`Regla Singleton infringida: "${name}" aparece ${count} veces en el mazo.`);
    }
  }

  return {
    isValid: errors.length === 0,
    totalCards,
    commanderCount: commanderTotal,
    commanderColorIdentity,
    errors,
    warnings,
  };
}
