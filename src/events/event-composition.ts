export type BuildItemSlot =
  | 'weapon'
  | 'offhand'
  | 'head'
  | 'chest'
  | 'shoes'
  | 'cape'
  | 'food'
  | 'potion'
  | 'mount';

export interface BuildItem {
  /** Nombre para mostrar (ej. "Maza 1h", "Judi Armor") */
  name: string;
  /** ID único en la API de Albion (ej. "T8_MAIN_MACE") — para imagen en render API */
  itemUniqueName?: string;
  slot?: BuildItemSlot;
}

export interface EventCompositionEntry {
  key: string;
  role: string;
  build: string;
  capacity: number;
  label?: string;
  emoji?: string;
  emojiKey?: string;
  /**
   * Referencia a un Build en la DB. Cuando está presente, buildItems se hidrata
   * automáticamente desde ese Build + catálogo de AlbionItems.
   */
  buildKey?: string;
  /** Items estructurados con soporte de imágenes via render API de Albion */
  buildItems?: BuildItem[];
}

export interface EventComposition {
  key: string;
  name: string;
  description?: string;
  entries: EventCompositionEntry[];
}

export const DEFAULT_EVENT_COMPOSITION_KEY = 'zvz-cta-20';

export const BASE_EVENT_COMPOSITIONS: EventComposition[] = [
  {
    key: DEFAULT_EVENT_COMPOSITION_KEY,
    name: 'CTA ZvZ 20',
    description: 'Composición actual de CTA para 20 jugadores.',
    entries: [
      {
        key: 'maza-1h',
        role: 'Tanque',
        build: 'Maza 1h',
        emoji: '🛡️',
        emojiKey: 'mace_1h',
        capacity: 1,
      },
      {
        key: 'ga-caballero',
        role: 'Tanque',
        build: 'GA',
        label: 'GA(Caballero)',
        emoji: '🛡️',
        emojiKey: 'great_arcane',
        capacity: 1,
      },
      {
        key: 'incubo-demonio',
        role: 'Tanque',
        build: 'Incubo',
        label: 'Incubo(Demonio)',
        emoji: '🛡️',
        emojiKey: 'incubus',
        capacity: 1,
      },
      {
        key: 'maza-1h-guardian',
        role: 'Tanque',
        build: 'Maza 1h',
        label: 'Maza 1h(Guardian)',
        emoji: '🛡️',
        emojiKey: 'mace_1h',
        capacity: 1,
      },
      {
        key: 'santificador-clerigo',
        role: 'Healer',
        build: 'Santificador',
        label: 'Santificador(Clérigo)',
        emoji: '💚',
        emojiKey: 'hallowfall',
        capacity: 1,
      },
      {
        key: 'exaltado-clerigo',
        role: 'Healer',
        build: 'Exaltado',
        label: 'Exaltado(Clérigo)',
        emoji: '💚',
        emojiKey: 'exalted',
        capacity: 1,
      },
      {
        key: 'caido-clerigo',
        role: 'Healer',
        build: 'Caido',
        label: 'Caido(Clérigo)',
        emoji: '💚',
        emojiKey: 'fallen',
        capacity: 1,
      },
      {
        key: 'invocador-oscuro',
        role: 'Soporte',
        build: 'Invocador oscuro',
        label: 'Invocador oscuro(Clérigo)',
        emoji: '🔮',
        emojiKey: 'damnation',
        capacity: 1,
      },
      {
        key: 'locus-enraizado',
        role: 'Soporte',
        build: 'Locus o Enraizado',
        label: 'Locus o Enraizado(Juez)',
        emoji: '🔮',
        emojiKey: 'locus',
        capacity: 1,
      },
      {
        key: 'juradores-demonio',
        role: 'Soporte',
        build: 'Juradores',
        label: 'Juradores(Demonio)',
        emoji: '🔮',
        emojiKey: 'oathkeepers',
        capacity: 1,
      },
      {
        key: 'tallada-clerigo',
        role: 'DPS',
        build: 'Tallada',
        label: 'Tallada(Clérigo)',
        emoji: '⚔️',
        emojiKey: 'carving',
        capacity: 1,
      },
      {
        key: 'puas-clerigo',
        role: 'DPS',
        build: 'Púas',
        label: 'Púas(Clérigo)',
        emoji: '⚔️',
        emojiKey: 'spiked_gauntlets',
        capacity: 1,
      },
      {
        key: 'rompereinos-clerigo',
        role: 'DPS',
        build: 'Rompereinos',
        label: 'Rompereinos(Clérigo)',
        emoji: '⚔️',
        emojiKey: 'realmbreaker',
        capacity: 1,
      },
      {
        key: 'cazaespiritu-clerigo',
        role: 'DPS',
        build: 'Cazaespiritu',
        label: 'Cazaespiritu(Clérigo)',
        emoji: '⚔️',
        emojiKey: 'spirithunter',
        capacity: 1,
      },
      {
        key: 'brazales-clerigo',
        role: 'DPS',
        build: 'Brazales',
        label: 'Brazales(Clérigo)',
        emoji: '⚔️',
        emojiKey: 'battle_bracers',
        capacity: 4,
      },
      {
        key: 'brazales-torre-movil',
        role: 'DPS',
        build: 'Brazales/Torre movil',
        label: 'Brazales(Clérigo)/Torre movil',
        emoji: '⚔️',
        emojiKey: 'battle_bracers',
        capacity: 1,
      },
      {
        key: 'basilisco',
        role: 'Montura',
        build: 'Basilisco',
        emoji: '🐉',
        capacity: 1,
      },
    ],
  },
  {
    key: 'small-scale-5',
    name: 'Small Scale 5',
    description: 'Base chica: 1 tanque, 1 healer y 3 DPS.',
    entries: [
      {
        key: 'tanque-maza-1h',
        role: 'Tanque',
        build: 'Maza 1h',
        emoji: '🛡️',
        emojiKey: 'mace_1h',
        capacity: 1,
      },
      {
        key: 'healer-santificador',
        role: 'Healer',
        build: 'Santificador',
        emoji: '💚',
        emojiKey: 'hallowfall',
        capacity: 1,
      },
      {
        key: 'dps',
        role: 'DPS',
        build: 'DPS flexible',
        emoji: '⚔️',
        capacity: 3,
      },
    ],
  },
  {
    key: 'dorados',
    name: 'Dorados',
    description: 'Composición de referencia tomada de Botsuito.',
    entries: [
      {
        key: 'incubo',
        role: 'Tanque',
        build: 'Incubo',
        label: 'Incubo',
        emoji: '🛡️',
        emojiKey: 'incubus',
        capacity: 1,
        buildItems: [
          {
            name: 'Incubo',
            itemUniqueName: 'T8_MAIN_MACE_HELL',
            slot: 'weapon',
          },
          {
            name: 'Judi Armor',
            itemUniqueName: 'T8_ARMOR_PLATE_KEEPER',
            slot: 'chest',
          },
          {
            name: 'Martlock Cape',
            itemUniqueName: 'T8_CAPEITEM_FW_MARTLOCK',
            slot: 'cape',
          },
          {
            name: 'Gigantify Potion',
            itemUniqueName: 'T8_POTION_REVIVE',
            slot: 'potion',
          },
          {
            name: 'Beef Stew',
            itemUniqueName: 'T8_MEAL_STEW',
            slot: 'food',
          },
        ],
      },
      {
        key: 'flamigero',
        role: 'DPS',
        build: 'Flamigero',
        label: 'Flamigero',
        emoji: '🔥',
        emojiKey: 'blazing',
        capacity: 1,
        buildItems: [
          {
            name: 'Flamigero',
            itemUniqueName: 'T8_2H_FIRESTAFF_HELL',
            slot: 'weapon',
          },
          {
            name: 'Cleric Robe',
            itemUniqueName: 'T8_ARMOR_CLOTH_SET2',
            slot: 'chest',
          },
          {
            name: 'Morgana Cape',
            itemUniqueName: 'T8_CAPEITEM_MORGANA',
            slot: 'cape',
          },
          {
            name: 'Resistance Potion',
            itemUniqueName: 'T8_POTION_STONESKIN',
            slot: 'potion',
          },
          {
            name: 'Beef Stew',
            itemUniqueName: 'T8_MEAL_STEW',
            slot: 'food',
          },
        ],
      },
      {
        key: 'santificador',
        role: 'Healer',
        build: 'Santificador',
        label: 'Santificador',
        emoji: '💚',
        emojiKey: 'hallowfall',
        capacity: 1,
        buildItems: [
          {
            name: 'Santificador',
            itemUniqueName: 'T8_MAIN_HOLYSTAFF_AVALON',
            slot: 'weapon',
          },
          {
            name: 'Cleric Robe',
            itemUniqueName: 'T8_ARMOR_CLOTH_SET2',
            slot: 'chest',
          },
          {
            name: 'Lymhurst Cape',
            itemUniqueName: 'T8_CAPEITEM_FW_LYMHURST',
            slot: 'cape',
          },
          {
            name: 'Energy Potion',
            itemUniqueName: 'T8_POTION_ENERGY',
            slot: 'potion',
          },
          {
            name: 'Omelette',
            itemUniqueName: 'T8_MEAL_OMELETTE',
            slot: 'food',
          },
        ],
      },
      {
        key: 'shadowcaller',
        role: 'DPS',
        build: 'Shadowcaller',
        label: 'Shadowcaller',
        emoji: '☠️',
        emojiKey: 'shadowcaller',
        capacity: 1,
        buildItems: [
          {
            name: 'Shadowcaller',
            itemUniqueName: 'T8_MAIN_CURSEDSTAFF_AVALON',
            slot: 'weapon',
          },
          {
            name: 'Hellion Jacket',
            itemUniqueName: 'T8_ARMOR_LEATHER_HELL',
            slot: 'chest',
          },
          {
            name: 'Thetford Cape',
            itemUniqueName: 'T8_CAPEITEM_FW_THETFORD',
            slot: 'cape',
          },
          {
            name: 'Poison Potion',
            itemUniqueName: 'T8_POTION_COOLDOWN',
            slot: 'potion',
          },
          {
            name: 'Beef Stew',
            itemUniqueName: 'T8_MEAL_STEW',
            slot: 'food',
          },
        ],
      },
      {
        key: 'perforanieblas',
        role: 'DPS',
        build: 'Perforanieblas',
        label: 'Perforanieblas',
        emoji: '🏹',
        emojiKey: 'mistpiercer',
        capacity: 3,
        buildItems: [
          {
            name: 'Perforanieblas',
            itemUniqueName: 'T8_2H_BOW_AVALON',
            slot: 'weapon',
          },
          {
            name: 'Cleric Robe',
            itemUniqueName: 'T8_ARMOR_CLOTH_SET2',
            slot: 'chest',
          },
          {
            name: 'Bridgewatch Cape',
            itemUniqueName: 'T8_CAPEITEM_FW_BRIDGEWATCH',
            slot: 'cape',
          },
          {
            name: 'Resistance Potion',
            itemUniqueName: 'T8_POTION_STONESKIN',
            slot: 'potion',
          },
          {
            name: 'Beef Stew',
            itemUniqueName: 'T8_MEAL_STEW',
            slot: 'food',
          },
        ],
      },
    ],
  },
];

export const EVENT_COMPOSITION_CHOICES = BASE_EVENT_COMPOSITIONS.map(
  (composition) => ({
    name: composition.name,
    value: composition.key,
  }),
);
