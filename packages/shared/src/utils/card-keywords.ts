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
    label: 'Toque mortal (Deathtouch)',
    iconName: 'Skull',
    reminderText:
      'Cualquier cantidad de daño que esto inflija a una criatura es suficiente para destruirla.',
  },
  {
    id: 'defender',
    nameEs: 'Defensor',
    nameEn: 'Defender',
    label: 'Defensor (Defender)',
    iconName: 'ShieldOff',
    reminderText: 'Esta criatura no puede atacar.',
  },
  {
    id: 'double_strike',
    nameEs: 'Daña dos veces',
    nameEn: 'Double strike',
    label: 'Daña dos veces (Double strike)',
    iconName: 'Swords',
    reminderText: 'Esta criatura hace daño tanto de dañar primero como daño de combate normal.',
  },
  {
    id: 'fear',
    nameEs: 'Miedo',
    nameEn: 'Fear',
    label: 'Miedo (Fear)',
    iconName: 'Ghost',
    reminderText:
      'Esta criatura no puede ser bloqueada excepto por criaturas artefacto y/o criaturas negras.',
  },
  {
    id: 'first_strike',
    nameEs: 'Daña primero',
    nameEn: 'First strike',
    label: 'Daña primero (First strike)',
    iconName: 'Zap',
    reminderText:
      'Esta criatura hace daño de combate antes que las criaturas que no tengan la habilidad de dañar primero.',
  },
  {
    id: 'flying',
    nameEs: 'Vuela',
    nameEn: 'Flying',
    label: 'Vuela (Flying)',
    iconName: 'Feather',
    reminderText:
      'Esta criatura no puede ser bloqueada excepto por criaturas con las habilidades de volar y/o alcance.',
  },
  {
    id: 'haste',
    nameEs: 'Prisa',
    nameEn: 'Haste',
    label: 'Prisa (Haste)',
    iconName: 'Flame',
    reminderText: 'Esta criatura puede atacar y girar en cuanto entra bajo tu control.',
  },
  {
    id: 'hexproof',
    nameEs: 'Antimaleficio',
    nameEn: 'Hexproof',
    label: 'Antimaleficio (Hexproof)',
    iconName: 'ShieldCheck',
    reminderText:
      'Este permanente no puede ser objetivo de hechizos o habilidades que controlen tus oponentes.',
  },
  {
    id: 'indestructible',
    nameEs: 'Indestructible',
    nameEn: 'Indestructible',
    label: 'Indestructible (Indestructible)',
    iconName: 'Sparkles',
    reminderText: 'El daño y los efectos que dicen "destruir" no destruyen este permanente.',
  },
  {
    id: 'lifelink',
    nameEs: 'Vínculo vital',
    nameEn: 'Lifelink',
    label: 'Vínculo vital (Lifelink)',
    iconName: 'Heart',
    reminderText:
      'El daño infligido por este permanente también hace que ganes esa misma cantidad de vidas.',
  },
  {
    id: 'menace',
    nameEs: 'Amenaza',
    nameEn: 'Menace',
    label: 'Amenaza (Menace)',
    iconName: 'Eye',
    reminderText: 'Esta criatura no puede ser bloqueada excepto por dos o más criaturas.',
  },
  {
    id: 'reach',
    nameEs: 'Alcance',
    nameEn: 'Reach',
    label: 'Alcance (Reach)',
    iconName: 'Crosshair',
    reminderText: 'Esta criatura puede bloquear criaturas con la habilidad de volar.',
  },
  {
    id: 'trample',
    nameEs: 'Arrollar',
    nameEn: 'Trample',
    label: 'Arrollar (Trample)',
    iconName: 'Footprints',
    reminderText:
      'Esta criatura puede asignar el daño de combate sobrante al jugador o planeswalker defensor si destruye a todos sus bloqueadores.',
  },
  {
    id: 'vigilance',
    nameEs: 'Vigilancia',
    nameEn: 'Vigilance',
    label: 'Vigilancia (Vigilance)',
    iconName: 'ShieldAlert',
    reminderText: 'Atacar no hace que esta criatura se gire.',
  },
];

export const MTG_COUNTERS: CounterDefinition[] = [
  {
    id: '+1/+1',
    nameEs: '+1/+1',
    nameEn: '+1/+1',
    label: '+1/+1 (+1/+1)',
    iconName: 'TrendingUp',
    reminderText: 'Aumenta la fuerza y resistencia de la criatura en +1/+1 por cada contador.',
  },
  {
    id: '−1/−1',
    nameEs: '−1/−1',
    nameEn: '-1/-1',
    label: '−1/−1 (-1/-1)',
    iconName: 'TrendingDown',
    reminderText: 'Reduce la fuerza y resistencia de la criatura en -1/-1 por cada contador.',
  },
  {
    id: 'loyalty',
    nameEs: 'Lealtad',
    nameEn: 'Loyalty',
    label: 'Lealtad (Loyalty)',
    iconName: 'Crown',
    reminderText: 'Contadores de lealtad para activar habilidades de lealtad en planeswalkers.',
  },
  {
    id: 'charge',
    nameEs: 'Carga',
    nameEn: 'Charge',
    label: 'Carga (Charge)',
    iconName: 'BatteryCharging',
    reminderText: 'Contadores de carga utilizados por artefactos para acumular o activar efectos.',
  },
  {
    id: 'lore',
    nameEs: 'Tradición',
    nameEn: 'Lore',
    label: 'Tradición (Lore)',
    iconName: 'BookOpen',
    reminderText:
      'Contadores que avanzan los capítulos de una saga en el paso principal previo al combate.',
  },
  {
    id: 'shield',
    nameEs: 'Escudo',
    nameEn: 'Shield',
    label: 'Escudo (Shield)',
    iconName: 'Shield',
    reminderText:
      'Si este permanente fuera a recibir daño o ser destruido, en vez de eso se retira un contador de escudo.',
  },
  {
    id: 'stun',
    nameEs: 'Aturdimiento',
    nameEn: 'Stun',
    label: 'Aturdimiento (Stun)',
    iconName: 'RotateCcw',
    reminderText:
      'Si un permanente con un contador de aturdimiento fuera a enderezarse, en vez de eso permanece girado y se retira un contador de aturdimiento.',
  },
  {
    id: 'time',
    nameEs: 'Tiempo',
    nameEn: 'Time',
    label: 'Tiempo (Time)',
    iconName: 'Hourglass',
    reminderText: 'Contadores de tiempo en cartas con las habilidades de suspender o desvanecerse.',
  },
  {
    id: 'finality',
    nameEs: 'Finalidad',
    nameEn: 'Finality',
    label: 'Finalidad (Finality)',
    iconName: 'ShieldX',
    reminderText:
      'Si este permanente fuera a ir a un cementerio desde el campo de batalla, en vez de eso se exilia.',
    isSingle: true,
  },
  {
    id: 'generic',
    nameEs: 'Genérico',
    nameEn: 'Generic',
    label: 'Genérico (Generic)',
    iconName: 'CircleDot',
    reminderText: 'Contador numérico de propósito general para registrar efectos diversos.',
  },
  {
    id: 'custom',
    nameEs: 'Personalizado',
    nameEn: 'Custom',
    label: 'Personalizado (Custom)',
    iconName: 'Tag',
    reminderText: 'Contador con nombre y propósito libre definido por el jugador.',
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
