import React from 'react';

/**
 * Mapeo canónico de Palabras Clave oficiales de MTG a clases de la fuente Mana (ms-ability-*).
 * Licencia: SIL Open Font License 1.1; Código CSS/LESS: MIT (Andrew Gioia).
 */
export const KEYWORD_ICON_CLASSES: Record<string, string> = {
  deathtouch: 'ms ms-ability-deathtouch',
  defender: 'ms ms-ability-defender',
  double_strike: 'ms ms-ability-double-strike',
  fear: 'ms ms-ability-fear',
  first_strike: 'ms ms-ability-first-strike',
  flying: 'ms ms-ability-flying',
  haste: 'ms ms-ability-haste',
  hexproof: 'ms ms-ability-hexproof',
  indestructible: 'ms ms-ability-indestructible',
  lifelink: 'ms ms-ability-lifelink',
  menace: 'ms ms-ability-menace',
  reach: 'ms ms-ability-reach',
  trample: 'ms ms-ability-trample',
  vigilance: 'ms ms-ability-vigilance',
  // Palabras clave adicionales compatibles
  ward: 'ms ms-ability-ward',
  flash: 'ms ms-ability-flash',
  infect: 'ms ms-ability-infect',
  toxic: 'ms ms-ability-toxic',
  prowess: 'ms ms-ability-prowess',
  annihilator: 'ms ms-ability-annihilator',
  cascade: 'ms ms-ability-static',
  scry: 'ms ms-ability-surveil',
};

/**
 * Mapeo canónico de Contadores oficiales de MTG a clases de la fuente Mana (ms-counter-*).
 * Para 'generic' y 'custom' no existe glifo nativo en la fuente Mana, por lo que se utiliza
 * un icono vectorial SVG propio, limpio y accesible.
 */
export const COUNTER_ICON_CLASSES: Record<string, string | null> = {
  '+1/+1': 'ms ms-counter-plus',
  '−1/−1': 'ms ms-counter-minus',
  '-1/-1': 'ms ms-counter-minus',
  loyalty: 'ms ms-counter-loyalty',
  charge: 'ms ms-counter-charge',
  lore: 'ms ms-counter-lore',
  shield: 'ms ms-counter-shield',
  stun: 'ms ms-counter-stun',
  time: 'ms ms-counter-time',
  finality: 'ms ms-counter-finality',
  poison: 'ms ms-counter-skull',
  rad: 'ms ms-counter-rad',
  energy: 'ms ms-e',
  experience: 'ms ms-counter-devotion',
  generic: null,
  custom: null,
};

/**
 * Icono SVG vectorial para Contador Genérico (cuando no existe en la fuente Mana).
 */
export const GenericCounterSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block align-middle shrink-0 ${className}`}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

/**
 * Icono SVG vectorial para Contador Personalizado (cuando no existe en la fuente Mana).
 */
export const CustomCounterSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block align-middle shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path d="M12 2l8.5 8.5-8.5 8.5-8.5-8.5L12 2z" fill="currentColor" fillOpacity="0.25" />
    <circle cx="12" cy="10.5" r="2" fill="currentColor" />
  </svg>
);

/**
 * Componente para renderizar el icono de una palabra clave de MTG usando Mana font.
 */
export const MtgKeywordIcon: React.FC<{
  keyword: string;
  className?: string;
  title?: string;
}> = ({ keyword, className = '', title }) => {
  const norm = keyword.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const cls =
    KEYWORD_ICON_CLASSES[norm] ||
    KEYWORD_ICON_CLASSES[keyword.toLowerCase().trim()] ||
    'ms ms-ability-static';
  return (
    <i
      className={`${cls} ${className} inline-block leading-none text-center`}
      title={title}
      aria-hidden="true"
    />
  );
};

/**
 * Componente para renderizar el icono de un contador de MTG usando Mana font o SVG propio.
 */
export const MtgCounterIcon: React.FC<{
  counterType: string;
  className?: string;
  title?: string;
}> = ({ counterType, className = '', title }) => {
  const norm = counterType.toLowerCase().trim();
  const cls = COUNTER_ICON_CLASSES[counterType] ?? COUNTER_ICON_CLASSES[norm];
  if (cls) {
    return (
      <i
        className={`${cls} ${className} inline-block leading-none text-center`}
        title={title}
        aria-hidden="true"
      />
    );
  }
  if (norm === 'custom') {
    return <CustomCounterSvg className={className} />;
  }
  return <GenericCounterSvg className={className} />;
};

/**
 * Resuelve la clase CSS de Mana font para un símbolo de coste o acción ({W}, {T}, {2/U}, etc.).
 */
export function getManaSymbolClass(symbol: string): string {
  const clean = symbol.replace(/[{}]/g, '').toLowerCase().trim();
  if (clean === 't') return 'ms ms-cost ms-tap';
  if (clean === 'q') return 'ms ms-cost ms-untap';
  if (clean === 'e') return 'ms ms-cost ms-e';
  if (clean === 'chaos') return 'ms ms-cost ms-chaos';
  // Hybrid o Phyrexian: {w/u} -> ms-wu, {2/w} -> ms-2w, {w/p} -> ms-wp
  const stripped = clean.replace(/[/]/g, '');
  return `ms ms-cost ms-${stripped}`;
}

/**
 * Componente para renderizar un símbolo de maná o regla oficial ({W}, {U}, {T}, etc.).
 */
export const MtgSymbolIcon: React.FC<{
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ symbol, size = 'md', className = '' }) => {
  const iconClass = getManaSymbolClass(symbol);
  const sizeClass =
    size === 'sm' ? 'text-[11px] mx-0.5' : size === 'lg' ? 'text-lg mx-1' : 'text-sm mx-0.5';

  return (
    <span
      className={`inline-flex items-center justify-center select-none align-middle ${sizeClass} ${className}`}
      title={symbol.startsWith('{') ? symbol : `{${symbol.toUpperCase()}}`}
    >
      <i className={iconClass} aria-hidden="true" />
    </span>
  );
};

/**
 * Componente para renderizar el símbolo de edición/set con la fuente Keyrune.
 * Licencia: SIL Open Font License 1.1; Glyphs: GPL 3.0 (Andrew Gioia).
 */
export const KeyruneSetIcon: React.FC<{
  setCode?: string;
  rarity?: string;
  className?: string;
  title?: string;
}> = ({ setCode, rarity = 'common', className = '', title }) => {
  const code = (setCode || 'cmd').toLowerCase().trim();
  const r = rarity.toLowerCase().trim();
  return (
    <i
      className={`ss ss-${code} ss-${r} ss-fw ${className}`}
      title={title || `${setCode?.toUpperCase()} (${rarity})`}
      aria-hidden="true"
    />
  );
};

/**
 * Helper para crear componentes de icono compatibles con la interfaz de Lucide ({ className?: string }).
 */
function makeKeywordWrapper(kwId: string): React.FC<{ className?: string }> {
  return function KeywordIconWrapper({ className }) {
    return <MtgKeywordIcon keyword={kwId} className={className} />;
  };
}

function makeCounterWrapper(typeId: string): React.FC<{ className?: string }> {
  return function CounterIconWrapper({ className }) {
    return <MtgCounterIcon counterType={typeId} className={className} />;
  };
}

/**
 * Diccionario canónico compatible con imports existentes de KEYWORD_ICONS.
 */
export const KEYWORD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  deathtouch: makeKeywordWrapper('deathtouch'),
  defender: makeKeywordWrapper('defender'),
  double_strike: makeKeywordWrapper('double_strike'),
  fear: makeKeywordWrapper('fear'),
  first_strike: makeKeywordWrapper('first_strike'),
  flying: makeKeywordWrapper('flying'),
  haste: makeKeywordWrapper('haste'),
  hexproof: makeKeywordWrapper('hexproof'),
  indestructible: makeKeywordWrapper('indestructible'),
  lifelink: makeKeywordWrapper('lifelink'),
  menace: makeKeywordWrapper('menace'),
  reach: makeKeywordWrapper('reach'),
  trample: makeKeywordWrapper('trample'),
  vigilance: makeKeywordWrapper('vigilance'),
  ward: makeKeywordWrapper('ward'),
  flash: makeKeywordWrapper('flash'),
  infect: makeKeywordWrapper('infect'),
  toxic: makeKeywordWrapper('toxic'),
  prowess: makeKeywordWrapper('prowess'),
};

/**
 * Diccionario canónico compatible con imports existentes de COUNTER_ICONS.
 */
export const COUNTER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  '+1/+1': makeCounterWrapper('+1/+1'),
  '−1/−1': makeCounterWrapper('−1/−1'),
  '-1/-1': makeCounterWrapper('-1/-1'),
  loyalty: makeCounterWrapper('loyalty'),
  charge: makeCounterWrapper('charge'),
  lore: makeCounterWrapper('lore'),
  shield: makeCounterWrapper('shield'),
  stun: makeCounterWrapper('stun'),
  time: makeCounterWrapper('time'),
  finality: makeCounterWrapper('finality'),
  poison: makeCounterWrapper('poison'),
  rad: makeCounterWrapper('rad'),
  energy: makeCounterWrapper('energy'),
  experience: makeCounterWrapper('experience'),
  generic: makeCounterWrapper('generic'),
  custom: makeCounterWrapper('custom'),
};
