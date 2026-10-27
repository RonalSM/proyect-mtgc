export interface KeywordDefinition {
  id: string;
  nameEs: string;
  nameEn: string;
  label: string;
  iconName: string;
  reminderText: string;
}

export interface CounterDefinition {
  id: string;
  nameEs: string;
  nameEn: string;
  label: string;
  iconName: string;
  reminderText: string;
  isSingle?: boolean;
}

export const MTG_KEYWORDS: KeywordDefinition[] = [
  {
    id: 'deathtouch',
    nameEs: 'Toque mortal',
    nameEn: 'Deathtouch',
    label: 'Deathtouch',
    iconName: 'Skull',
    reminderText:
      'Any amount of damage this deals to a creature is enough to destroy it.',
  },
  {
    id: 'defender',
    nameEs: 'Defensor',
    nameEn: 'Defender',
    label: 'Defender',
    iconName: 'ShieldOff',
    reminderText: 'This creature cannot attack.',
  },
  {
    id: 'double_strike',
    nameEs: 'Daña dos veces',
    nameEn: 'Double strike',
    label: 'Double strike',
    iconName: 'Swords',
    reminderText: 'This creature deals both first-strike and regular combat damage.',
  },
  {
    id: 'fear',
    nameEs: 'Miedo',
    nameEn: 'Fear',
    label: 'Fear',
    iconName: 'Ghost',
    reminderText:
      'This creature cannot be blocked except by artifact creatures and/or black creatures.',
  },
  {
    id: 'first_strike',
    nameEs: 'Daña primero',
    nameEn: 'First strike',
    label: 'First strike',
    iconName: 'Zap',
    reminderText:
      'This creature deals combat damage before creatures without first strike.',
  },
  {
    id: 'flying',
    nameEs: 'Vuela',
    nameEn: 'Flying',
    label: 'Flying',
    iconName: 'Feather',
    reminderText:
      'This creature cannot be blocked except by creatures with flying and/or reach.',
  },
  {
    id: 'haste',
    nameEs: 'Prisa',
    nameEn: 'Haste',
    label: 'Haste',
    iconName: 'Flame',
    reminderText: 'This creature can attack and tap as soon as it comes under your control.',
  },
  {
    id: 'hexproof',
    nameEs: 'Antimaleficio',
    nameEn: 'Hexproof',
    label: 'Hexproof',
    iconName: 'ShieldCheck',
    reminderText:
      'This permanent cannot be the target of spells or abilities your opponents control.',
  },
  {
    id: 'indestructible',
    nameEs: 'Indestructible',
    nameEn: 'Indestructible',
    label: 'Indestructible',
    iconName: 'Sparkles',
    reminderText: 'Damage and effects that say "destroy" don\'t destroy this permanent.',
  },
  {
    id: 'lifelink',
    nameEs: 'Vínculo vital',
    nameEn: 'Lifelink',
    label: 'Lifelink',
    iconName: 'Heart',
    reminderText:
      'Damage dealt by this permanent also causes you to gain that much life.',
  },
  {
    id: 'menace',
    nameEs: 'Amenaza',
    nameEn: 'Menace',
    label: 'Menace',
    iconName: 'Eye',
    reminderText: 'This creature cannot be blocked except by two or more creatures.',
  },
  {
    id: 'reach',
    nameEs: 'Alcance',
    nameEn: 'Reach',
    label: 'Reach',
    iconName: 'Crosshair',
    reminderText: 'This creature can block creatures with flying.',
  },
  {
    id: 'trample',
    nameEs: 'Arrollar',
    nameEn: 'Trample',
    label: 'Trample',
    iconName: 'Footprints',
    reminderText:
      'This creature can deal excess combat damage to the defending player or planeswalker.',
  },
  {
    id: 'vigilance',
    nameEs: 'Vigilancia',
    nameEn: 'Vigilance',
    label: 'Vigilance',
    iconName: 'ShieldAlert',
    reminderText: 'Attacking does not cause this creature to tap.',
  },
];

export const MTG_COUNTERS: CounterDefinition[] = [
  {
    id: '+1/+1',
    nameEs: '+1/+1',
    nameEn: '+1/+1',
    label: '+1/+1',
    iconName: 'TrendingUp',
    reminderText: 'Gives +1/+1 for each counter.',
  },
  {
    id: '−1/−1',
    nameEs: '−1/−1',
    nameEn: '-1/-1',
    label: '-1/-1',
    iconName: 'TrendingDown',
    reminderText: 'Gives -1/-1 for each counter.',
  },
  {
    id: 'loyalty',
    nameEs: 'Lealtad',
    nameEn: 'Loyalty',
    label: 'Loyalty',
    iconName: 'Crown',
    reminderText: 'Loyalty counters to activate planeswalker loyalty abilities.',
  },
  {
    id: 'charge',
    nameEs: 'Carga',
    nameEn: 'Charge',
    label: 'Charge',
    iconName: 'BatteryCharging',
    reminderText: 'Charge counters used by artifacts to accumulate or trigger effects.',
  },
  {
    id: 'lore',
    nameEs: 'Tradición',
    nameEn: 'Lore',
    label: 'Lore',
    iconName: 'BookOpen',
    reminderText:
      'Counters that advance saga chapters in your precombat main phase.',
  },
  {
    id: 'shield',
    nameEs: 'Escudo',
    nameEn: 'Shield',
    label: 'Shield',
    iconName: 'Shield',
    reminderText:
      'If this permanent would be dealt damage or destroyed, a shield counter is removed instead.',
  },
  {
    id: 'stun',
    nameEs: 'Aturdimiento',
    nameEn: 'Stun',
    label: 'Stun',
    iconName: 'RotateCcw',
    reminderText:
      'If a permanent with a stun counter would become untapped, it stays tapped and a stun counter is removed.',
  },
  {
    id: 'time',
    nameEs: 'Tiempo',
    nameEn: 'Time',
    label: 'Time',
    iconName: 'Hourglass',
    reminderText: 'Time counters on cards with suspend or vanishing.',
  },
  {
    id: 'finality',
    nameEs: 'Finalidad',
    nameEn: 'Finality',
    label: 'Finality',
    iconName: 'ShieldX',
    reminderText:
      'If this permanent would go to a graveyard from the battlefield, exile it instead.',
    isSingle: true,
  },
  {
    id: 'generic',
    nameEs: 'Genérico',
    nameEn: 'Generic',
    label: 'Generic',
    iconName: 'CircleDot',
    reminderText: 'General purpose numeric counter.',
  },
  {
    id: 'custom',
    nameEs: 'Personalizado',
    nameEn: 'Custom',
    label: 'Custom',
    iconName: 'Tag',
    reminderText: 'Custom named counter.',
  },
];

export function getKeywordDefinition(id: string): KeywordDefinition | undefined {
  const norm = id.toLowerCase().trim();
  return MTG_KEYWORDS.find(
    k => k.id === norm || k.nameEs.toLowerCase() === norm || k.nameEn.toLowerCase() === norm,
  );
}

export function getCounterDefinition(id: string): CounterDefinition | undefined {
  const norm = id.toLowerCase().trim();
  if (norm === '+1/+1') return MTG_COUNTERS.find(c => c.id === '+1/+1');
  if (norm === '-1/-1' || norm === '−1/−1') return MTG_COUNTERS.find(c => c.id === '−1/−1');
  return MTG_COUNTERS.find(
    c => c.id === norm || c.nameEs.toLowerCase() === norm || c.nameEn.toLowerCase() === norm,
  );
}
