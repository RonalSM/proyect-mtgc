export interface ParsedDeckLine {
  rawLine: string;
  quantity: number;
  cardName: string;
  set?: string;
  collectorNumber?: string;
  isCommander: boolean;
  isSideboard: boolean;
}

export interface ParseDeckResult {
  commanderEntries: ParsedDeckLine[];
  maindeckEntries: ParsedDeckLine[];
  sideboardEntries: ParsedDeckLine[];
  totalCards: number;
  warnings: string[];
}

/**
 * Parses raw text decklists from MTG Arena, Moxfield, Archidekt, TappedOut, MTGO, etc.
 * Supports syntax like:
 *   1 Sol Ring
 *   1x Atraxa, Praetors' Voice *CMDR*
 *   1 Command Tower (CMR) 350
 *   // Commander
 *   Commander: The Ur-Dragon
 *   SB: 1 Sol Ring
 */
export function parseDecklist(text: string): ParseDeckResult {
  const lines = text.split(/\r?\n/);
  const commanderEntries: ParsedDeckLine[] = [];
  const maindeckEntries: ParsedDeckLine[] = [];
  const sideboardEntries: ParsedDeckLine[] = [];
  const warnings: string[] = [];

  let currentSection: 'main' | 'commander' | 'sideboard' = 'main';

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]!.trim();
    if (!originalLine) continue;

    // Detect section headers (English and Spanish)
    const lower = originalLine.toLowerCase();
    if (
      lower.startsWith('// commander') ||
      lower.startsWith('# commander') ||
      lower.startsWith('// comandante') ||
      lower.startsWith('# comandante') ||
      lower === 'commander' ||
      lower === 'commanders' ||
      lower === 'comandante' ||
      lower === 'comandantes'
    ) {
      currentSection = 'commander';
      continue;
    }

    if (
      lower.startsWith('// companion') ||
      lower.startsWith('// sideboard') ||
      lower.startsWith('# sideboard') ||
      lower.startsWith('// banquillo') ||
      lower === 'sideboard' ||
      lower === 'banquillo'
    ) {
      currentSection = 'sideboard';
      continue;
    }

    if (
      lower.startsWith('// deck') ||
      lower.startsWith('// main') ||
      lower.startsWith('# main') ||
      lower.startsWith('// mazo') ||
      lower.startsWith('# mazo') ||
      lower.startsWith('// cartas') ||
      lower === 'deck' ||
      lower === 'mainboard' ||
      lower === 'mazo'
    ) {
      currentSection = 'main';
      continue;
    }

    // Skip general comments
    if (originalLine.startsWith('//') || originalLine.startsWith('#')) {
      continue;
    }

    let line = originalLine;
    let isCommander = currentSection === 'commander';
    let isSideboard = currentSection === 'sideboard';

    // Detect inline flags: *CMDR*, *Commander*, (Commander)
    if (/\*cmdr\*|\*commander\*|\(commander\)/i.test(line)) {
      isCommander = true;
      line = line.replace(/\*cmdr\*|\*commander\*|\(commander\)/gi, '').trim();
    }

    // Detect SB: prefix
    if (/^sb:\s*/i.test(line)) {
      isSideboard = true;
      line = line.replace(/^sb:\s*/i, '').trim();
    }

    // Detect Commander: prefix
    if (/^commander:\s*/i.test(line)) {
      isCommander = true;
      line = line.replace(/^commander:\s*/i, '').trim();
    }

    // Match quantity and card name (e.g., "1x Sol Ring", "4 Counterspell")
    const match = line.match(/^(\d+)[xX]?\s+(.+)$/);
    let quantity = 1;
    let cardPart = line;

    if (match && match[1] && match[2]) {
      quantity = parseInt(match[1], 10);
      cardPart = match[2].trim();
    } else {
      // If no quantity provided, assume 1
      quantity = 1;
      cardPart = line;
    }

    // Extract set and collector number if present, e.g. "Sol Ring (CMR) 350" or "Sol Ring [CMR] 350"
    let setCode: string | undefined;
    let collectorNumber: string | undefined;

    const setMatch = cardPart.match(/\s+[\(\[]([A-Za-z0-9_]{3,6})[\)\]](?:\s+([A-Za-z0-9_-]+))?/);
    if (setMatch) {
      setCode = setMatch[1];
      collectorNumber = setMatch[2];
      cardPart = cardPart
        .replace(/\s+[\(\[]([A-Za-z0-9_]{3,6})[\)\]](?:\s+([A-Za-z0-9_-]+))?/, '')
        .trim();
    }

    // Clean foil tags like *F* or *E*
    cardPart = cardPart.replace(/\*[a-zA-Z0-9]+\*/g, '').trim();

    if (!cardPart) continue;

    const entry: ParsedDeckLine = {
      rawLine: originalLine,
      quantity,
      cardName: cardPart,
      set: setCode,
      collectorNumber,
      isCommander,
      isSideboard,
    };

    if (isCommander) {
      commanderEntries.push(entry);
    } else if (isSideboard) {
      sideboardEntries.push(entry);
    } else {
      maindeckEntries.push(entry);
    }
  }

  const totalCards =
    commanderEntries.reduce((sum, e) => sum + e.quantity, 0) +
    maindeckEntries.reduce((sum, e) => sum + e.quantity, 0);

  if (commanderEntries.length === 0) {
    warnings.push('No se detectó ningún comandante explícito en la lista.');
  }

  return {
    commanderEntries,
    maindeckEntries,
    sideboardEntries,
    totalCards,
    warnings,
  };
}
