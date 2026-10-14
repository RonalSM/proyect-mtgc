/**
 * Infers genuine MTG card type line from card name when full Scryfall data is not yet resolved.
 */
export function inferCardTypeLine(cardName?: string, currentTypeLine?: string): string {
  if (currentTypeLine && currentTypeLine !== 'Spell' && currentTypeLine !== 'Carta') {
    return currentTypeLine;
  }
  if (!cardName) return 'Card';

  const lower = cardName.toLowerCase();
  if (
    lower.includes('forest') ||
    lower.includes('island') ||
    lower.includes('mountain') ||
    lower.includes('plains') ||
    lower.includes('swamp') ||
    lower.includes('tower') ||
    lower.includes('land') ||
    lower.includes('triome') ||
    lower.includes('orchard') ||
    lower.includes('pool') ||
    lower.includes('shrine') ||
    lower.includes('beacon') ||
    lower.includes('bog')
  ) {
    return 'Land';
  }

  if (
    lower.includes('sol ring') ||
    lower.includes('signet') ||
    lower.includes('stone') ||
    lower.includes('talisman') ||
    lower.includes('chalice') ||
    lower.includes('cornucopia') ||
    lower.includes('engine') ||
    lower.includes('ozolith') ||
    lower.includes('artifact')
  ) {
    return 'Artifact';
  }

  if (
    lower.includes('swords to') ||
    lower.includes('counterspell') ||
    lower.includes('bolt') ||
    lower.includes('intervention') ||
    lower.includes('protection') ||
    lower.includes('rift') ||
    lower.includes('path to') ||
    lower.includes('chaos warp') ||
    lower.includes('brainstorm') ||
    lower.includes('dark ritual') ||
    lower.includes('unmaking') ||
    lower.includes('trophy') ||
    lower.includes('instant')
  ) {
    return 'Instant';
  }

  if (
    lower.includes('tutor') ||
    lower.includes('cultivate') ||
    lower.includes('reach') ||
    lower.includes('ponder') ||
    lower.includes('deluge') ||
    lower.includes('verdict') ||
    lower.includes('farseek') ||
    lower.includes('lore') ||
    lower.includes('visits') ||
    lower.includes('sorcery')
  ) {
    return 'Sorcery';
  }

  if (
    lower.includes('study') ||
    lower.includes('tithe') ||
    lower.includes('season') ||
    lower.includes('remora') ||
    lower.includes('library') ||
    lower.includes('tide') ||
    lower.includes('enchantment')
  ) {
    return 'Enchantment';
  }

  if (
    lower.includes('teferi') ||
    lower.includes('tamiyo') ||
    lower.includes('narset') ||
    lower.includes('vraska') ||
    lower.includes('ajani') ||
    lower.includes('elspeth') ||
    lower.includes('ugin')
  ) {
    return 'Legendary Planeswalker';
  }

  if (
    lower.includes('atraxa') ||
    lower.includes('edgar') ||
    lower.includes('urza') ||
    lower.includes('ur-dragon') ||
    lower.includes('kess')
  ) {
    return 'Legendary Creature';
  }

  return 'Creature';
}
