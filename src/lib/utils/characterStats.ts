// Computed character stats — derives all display values from stored character data

interface CharacterData {
  level: number;
  race_id: string | null;
  class_id: string | null;
  str_base: number | null;
  dex_base: number | null;
  con_base: number | null;
  int_base: number | null;
  wis_base: number | null;
  cha_base: number | null;
  skill_proficiencies: string[];
  equipment: Array<{ item_id: string; quantity: number; equipped: boolean }>;
  hp_max: number | null;
  hp_current: number | null;
  hp_temp: number | null;
}

interface RaceData {
  ability_bonuses: Record<string, number>;
  speed: number;
  darkvision: number;
  size: string;
}

interface ClassData {
  hit_die: number;
  primary_abilities: string[];
  saving_throw_proficiencies: string[];
  spellcasting: {
    ability: string;
    cantrips_known?: number;
    spells_known?: number;
  } | null;
}

interface ItemData {
  id: string;
  ac_base?: number;
  ac_dex_bonus?: boolean;
  ac_max_dex?: number;
  type: string;
}

export interface ComputedStats {
  // Ability scores (with racial bonuses)
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Modifiers
  strMod: number;
  dexMod: number;
  conMod: number;
  intMod: number;
  wisMod: number;
  chaMod: number;

  // Core stats
  proficiencyBonus: number;
  ac: number;
  initiative: number;
  speed: number;
  hpMax: number;
  hpCurrent: number;
  hpTemp: number;
  hitDiceTotal: number;
  hitDie: number;

  // Spellcasting (null if not a caster)
  spellSaveDC: number | null;
  spellAttackBonus: number | null;
  spellcastingAbility: string | null;

  // Passive scores
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  // Skills
  skills: Record<string, { modifier: number; proficient: boolean }>;

  // Saving throws
  savingThrows: Record<string, { modifier: number; proficient: boolean }>;

  darkvision: number;
  size: string;
}

const ABILITY_NAMES = ["str", "dex", "con", "int", "wis", "cha"] as const;

const SKILLS: Record<string, (typeof ABILITY_NAMES)[number]> = {
  acrobatics: "dex",
  "animal-handling": "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight-of-hand": "dex",
  stealth: "dex",
  survival: "wis",
};

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonusForLevel(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function computeCharacterStats(
  character: CharacterData,
  race: RaceData | null,
  classData: ClassData | null,
  equippedItems: ItemData[]
): ComputedStats {
  // 2024 rules: species no longer grant ability bonuses
  // Ability scores are base values (already include background bonuses chosen by player)
  const str = character.str_base || 10;
  const dex = character.dex_base || 10;
  const con = character.con_base || 10;
  const int = character.int_base || 10;
  const wis = character.wis_base || 10;
  const cha = character.cha_base || 10;

  const scores: Record<string, number> = { str, dex, con, int, wis, cha };
  const mods: Record<string, number> = {};
  for (const ab of ABILITY_NAMES) {
    mods[ab] = abilityMod(scores[ab]);
  }

  const profBonus = proficiencyBonusForLevel(character.level);
  const hitDie = classData?.hit_die || 8;

  // AC calculation
  let ac = 10 + mods.dex; // base unarmored
  const armor = equippedItems.find(
    (i) => i.type === "armor" && i.ac_base != null
  );
  if (armor) {
    ac = armor.ac_base!;
    if (armor.ac_dex_bonus) {
      const maxDex = armor.ac_max_dex ?? Infinity;
      ac += Math.min(mods.dex, maxDex);
    }
  }
  // Shield
  const hasShield = equippedItems.some(
    (i) => i.id === "shield" || i.type === "armor"
  );
  // Simple shield check — if there's a shield item
  const shield = equippedItems.find((i) => i.id === "shield");
  if (shield) {
    ac += 2;
  }

  // HP
  const hpMax =
    character.hp_max ||
    hitDie + mods.con + (character.level - 1) * (Math.ceil(hitDie / 2) + 1 + mods.con);
  const hpCurrent = character.hp_current ?? hpMax;

  // Spellcasting
  let spellSaveDC: number | null = null;
  let spellAttackBonus: number | null = null;
  let spellcastingAbility: string | null = null;
  if (classData?.spellcasting) {
    spellcastingAbility = classData.spellcasting.ability;
    const abilityMod = mods[spellcastingAbility] || 0;
    spellSaveDC = 8 + profBonus + abilityMod;
    spellAttackBonus = profBonus + abilityMod;
  }

  // Skills
  const skills: Record<string, { modifier: number; proficient: boolean }> = {};
  for (const [skill, ability] of Object.entries(SKILLS)) {
    const proficient = character.skill_proficiencies.includes(skill);
    skills[skill] = {
      modifier: mods[ability] + (proficient ? profBonus : 0),
      proficient,
    };
  }

  // Saving throws
  const savingThrows: Record<
    string,
    { modifier: number; proficient: boolean }
  > = {};
  const saveProficiencies = classData?.saving_throw_proficiencies || [];
  for (const ab of ABILITY_NAMES) {
    const proficient = saveProficiencies.includes(ab);
    savingThrows[ab] = {
      modifier: mods[ab] + (proficient ? profBonus : 0),
      proficient,
    };
  }

  return {
    str,
    dex,
    con,
    int,
    wis,
    cha,
    strMod: mods.str,
    dexMod: mods.dex,
    conMod: mods.con,
    intMod: mods.int,
    wisMod: mods.wis,
    chaMod: mods.cha,
    proficiencyBonus: profBonus,
    ac,
    initiative: mods.dex,
    speed: race?.speed || 30,
    hpMax,
    hpCurrent,
    hpTemp: character.hp_temp || 0,
    hitDiceTotal: character.level,
    hitDie,
    spellSaveDC,
    spellAttackBonus,
    spellcastingAbility,
    passivePerception: 10 + (skills.perception?.modifier || mods.wis),
    passiveInvestigation: 10 + (skills.investigation?.modifier || mods.int),
    passiveInsight: 10 + (skills.insight?.modifier || mods.wis),
    skills,
    savingThrows,
    darkvision: race?.darkvision || 0,
    size: race?.size || "Medium",
  };
}
