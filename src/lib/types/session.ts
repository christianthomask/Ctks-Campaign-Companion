// Session content types — matches the structured JSONB in the sessions table

export interface SessionContent {
  meta: SessionMeta;
  quick_reference: QuickReference;
  acts: Act[];
  appendices: Appendix[];
}

export interface SessionMeta {
  title: string;
  subtitle: string;
  level: number;
  party_size: string;
  estimated_duration: string;
  tone: string;
  lethality: string;
  content_note?: string;
}

export interface QuickReference {
  setting: SettingDetails;
  npcs: NpcEntry[];
  puzzle_tracker: PuzzleEntry[];
  treasure_summary: TreasureEntry[];
  exploration_flowchart: string;
}

export interface SettingDetails {
  walls: string;
  floors: string;
  doors: string;
  light: string;
  miasma: string;
  atmosphere: string;
  sound: string;
  resting: string;
  ceilings: string;
}

export interface NpcEntry {
  name: string;
  location: string;
  voice: string;
  key_info: string;
}

export interface PuzzleEntry {
  letter: string;
  room: string;
  found: boolean;
}

export interface TreasureEntry {
  room: string;
  item: string;
  value: string;
}

export interface Act {
  id: string;
  title: string;
  target_time: string;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  tags: string[];
  read_aloud?: string | null;
  description: string;
  dm_notes?: DmNote[];
  threats?: Threat[];
  interactions?: Interaction[];
  treasure?: TreasureEntry[];
  puzzle_book?: PuzzleBookEntry | null;
  lethality_warning?: string;
  connections?: string[];
}

export interface DmNote {
  type: "tip" | "warning" | "lore" | "rp_guidance";
  title?: string;
  content: string;
}

export interface Threat {
  name: string;
  stat_block: StatBlock;
  behavior: string;
  combat_notes: string;
  trigger?: string;
}

export interface StatBlock {
  name: string;
  ac: number;
  ac_note?: string;
  hp: number;
  hp_formula: string;
  speed: string;
  abilities?: Abilities;
  cr: string;
  attacks: Attack[];
  special_abilities?: SpecialAbility[];
  damage_vulnerabilities?: string[];
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  senses?: string;
  languages?: string;
}

export interface Abilities {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface Attack {
  name: string;
  to_hit: number;
  reach: string;
  damage: string;
  damage_type: string;
  effects?: string;
}

export interface SpecialAbility {
  name: string;
  description: string;
}

export interface Interaction {
  action: string;
  check?: string;
  result: string;
}

export interface PuzzleBookEntry {
  letter: string;
  location_description: string;
  discovery: string;
  illustration: string;
}

export interface Appendix {
  id: string;
  title: string;
  content: WhimsyEntry[] | LoreThread[];
}

export interface WhimsyEntry {
  roll: number;
  description: string;
}

export interface LoreThread {
  thread: string;
  clue: string;
  future: string;
}
