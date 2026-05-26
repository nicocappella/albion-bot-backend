export interface AlbionWeaponEmojiDefinition {
  key: string;
  emojiName: string;
  itemUniqueName: string;
  label: string;
}

export const ALBION_WEAPON_EMOJIS: AlbionWeaponEmojiDefinition[] = [
  {
    key: 'mace_1h',
    emojiName: 'ao_mace_1h',
    itemUniqueName: 'T8_MAIN_MACE',
    label: 'Maza 1h',
  },
  {
    key: 'great_arcane',
    emojiName: 'ao_great_arcane',
    itemUniqueName: 'T8_2H_ARCANESTAFF',
    label: 'Gran arcano',
  },
  {
    key: 'incubus',
    emojiName: 'ao_incubus',
    itemUniqueName: 'T8_MAIN_MACE_HELL',
    label: 'Incubo',
  },
  {
    key: 'hallowfall',
    emojiName: 'ao_hallowfall',
    itemUniqueName: 'T8_MAIN_HOLYSTAFF_AVALON',
    label: 'Santificador',
  },
  {
    key: 'exalted',
    emojiName: 'ao_exalted',
    itemUniqueName: 'T8_2H_HOLYSTAFF_CRYSTAL',
    label: 'Exaltado',
  },
  {
    key: 'fallen',
    emojiName: 'ao_fallen',
    itemUniqueName: 'T8_2H_HOLYSTAFF_HELL',
    label: 'Caido',
  },
  {
    key: 'damnation',
    emojiName: 'ao_damnation',
    itemUniqueName: 'T8_2H_CURSEDSTAFF_MORGANA',
    label: 'Invocador oscuro',
  },
  {
    key: 'locus',
    emojiName: 'ao_locus',
    itemUniqueName: 'T8_2H_ARCANESTAFF_HELL',
    label: 'Locus',
  },
  {
    key: 'oathkeepers',
    emojiName: 'ao_oathkeepers',
    itemUniqueName: 'T8_2H_DUALMACE_AVALON',
    label: 'Juradores',
  },
  {
    key: 'carving',
    emojiName: 'ao_carving',
    itemUniqueName: 'T8_2H_CLEAVER_HELL',
    label: 'Tallada',
  },
  {
    key: 'spiked_gauntlets',
    emojiName: 'ao_spiked_gauntlets',
    itemUniqueName: 'T8_2H_KNUCKLES_SET3',
    label: 'Puas',
  },
  {
    key: 'realmbreaker',
    emojiName: 'ao_realmbreaker',
    itemUniqueName: 'T8_2H_AXE_AVALON',
    label: 'Rompereinos',
  },
  {
    key: 'spirithunter',
    emojiName: 'ao_spirithunter',
    itemUniqueName: 'T8_2H_HARPOON_HELL',
    label: 'Cazaespiritu',
  },
  {
    key: 'battle_bracers',
    emojiName: 'ao_battle_bracers',
    itemUniqueName: 'T8_2H_KNUCKLES_SET2',
    label: 'Brazales',
  },
  {
    key: 'blazing',
    emojiName: 'ao_blazing',
    itemUniqueName: 'T8_2H_FIRESTAFF_HELL',
    label: 'Flamigero',
  },
  {
    key: 'shadowcaller',
    emojiName: 'ao_shadowcaller',
    itemUniqueName: 'T8_MAIN_CURSEDSTAFF_AVALON',
    label: 'Shadowcaller',
  },
  {
    key: 'mistpiercer',
    emojiName: 'ao_mistpiercer',
    itemUniqueName: 'T8_2H_BOW_AVALON',
    label: 'Perforanieblas',
  },
];

export const ALBION_WEAPON_EMOJIS_BY_KEY = new Map(
  ALBION_WEAPON_EMOJIS.map((emoji) => [emoji.key, emoji]),
);
