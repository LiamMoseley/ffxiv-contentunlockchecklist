// PROTOTYPE sample data: about 20 hand-written entries over two expansions.
// Shaped like the wiki's Content Unlock tables, but details are illustrative, not checked.

export type EntryType = 'Dungeon' | 'Trial' | 'Raid' | 'Job Unlock' | 'Game Mechanic';

export interface Entry {
  id: string;
  sectionId: string;
  level: number; // character level in a levelling section, item level in a level-cap section
  unlock: string;
  type: EntryType;
  quest: string;
  location: string;
  notes?: string;
  optionalChallenge?: boolean;
  isNew?: boolean;
}

export interface Section {
  id: string;
  expansionId: string;
  kind: 'levelling' | 'cap';
  title: string; // e.g. "Level 61–70"
}

export interface Expansion {
  id: string;
  name: string;
  short: string;
  levels: string;
  cap: number;
}

export const PATCH = '7.4';

export const expansions: Expansion[] = [
  { id: 'sb', name: 'Stormblood', short: 'SB', levels: '61–70', cap: 70 },
  { id: 'shb', name: 'Shadowbringers', short: 'ShB', levels: '71–80', cap: 80 },
];

export const sections: Section[] = [
  { id: 'sb-lev', expansionId: 'sb', kind: 'levelling', title: 'Level 61–70' },
  { id: 'sb-cap', expansionId: 'sb', kind: 'cap', title: 'Level 70' },
  { id: 'shb-lev', expansionId: 'shb', kind: 'levelling', title: 'Level 71–80' },
  { id: 'shb-cap', expansionId: 'shb', kind: 'cap', title: 'Level 80' },
];

export const entries: Entry[] = [
  { id: 'e1', sectionId: 'sb-lev', level: 50, unlock: 'Samurai', type: 'Job Unlock', quest: 'The Way of the Samurai', location: "Ul'dah - Steps of Nald (9.1, 9.0)", notes: 'Requires a Disciple of War or Magic at level 50.' },
  { id: 'e2', sectionId: 'sb-lev', level: 61, unlock: 'The Sirensong Sea', type: 'Dungeon', quest: 'Tide Goes In, Imperials Go Out', location: 'The Ruby Sea (36.0, 29.4)' },
  { id: 'e3', sectionId: 'sb-lev', level: 63, unlock: 'The Pool of Tribute', type: 'Trial', quest: 'Tide Goes In, Imperials Go Out', location: 'The Ruby Sea (88.3, 13.6)' },
  { id: 'e4', sectionId: 'sb-lev', level: 65, unlock: "Bardam's Mettle", type: 'Dungeon', quest: 'The Mettle of the Steppe', location: 'The Azim Steppe (32.6, 28.2)' },
  { id: 'e5', sectionId: 'sb-lev', level: 67, unlock: 'Doma Castle', type: 'Dungeon', quest: 'The Die Is Cast', location: 'Yanxia (39.0, 13.2)' },
  { id: 'e6', sectionId: 'sb-lev', level: 69, unlock: 'Castrum Abania', type: 'Dungeon', quest: 'Return of the Bull', location: "The Fringes (13.8, 11.9)", notes: 'Optional Dungeon.' },
  { id: 'e7', sectionId: 'sb-cap', level: 310, unlock: 'Deltascape V1.0', type: 'Raid', quest: 'The Hunt for Omega', location: 'Rhalgr\'s Reach (11.6, 13.8)' },
  { id: 'e8', sectionId: 'sb-cap', level: 320, unlock: 'Deltascape V1.0 (Savage)', type: 'Raid', quest: 'The Hunt for Omega', location: "Rhalgr's Reach (11.6, 13.8)", notes: 'Optional challenge content.', optionalChallenge: true },
  { id: 'e9', sectionId: 'sb-cap', level: 315, unlock: 'The Royal City of Rabanastre', type: 'Raid', quest: 'Annoying the Ancients', location: "Rhalgr's Reach (13.0, 11.8)", notes: '24-player alliance raid.' },
  { id: 'e10', sectionId: 'sb-cap', level: 0, unlock: 'Eureka Anemos', type: 'Game Mechanic', quest: 'And We Shall Call It Eureka', location: 'Kugane (10.0, 10.5)', notes: 'Exploration zone with its own levelling.' },
  { id: 'e11', sectionId: 'shb-lev', level: 60, unlock: 'Gunbreaker', type: 'Job Unlock', quest: 'The Makings of a Gunbreaker', location: 'New Gridania (14.3, 9.9)', isNew: false },
  { id: 'e12', sectionId: 'shb-lev', level: 71, unlock: 'Holminster Switch', type: 'Dungeon', quest: 'The Lightwardens', location: 'Lakeland (36.0, 20.6)' },
  { id: 'e13', sectionId: 'shb-lev', level: 73, unlock: 'Dohn Mheg', type: 'Dungeon', quest: 'The Fae Court', location: 'Il Mheg (13.6, 7.4)' },
  { id: 'e14', sectionId: 'shb-lev', level: 75, unlock: 'The Dancing Plague', type: 'Trial', quest: 'Fit for a Queen', location: 'Il Mheg (13.3, 10.6)' },
  { id: 'e15', sectionId: 'shb-lev', level: 77, unlock: "Malikah's Well", type: 'Dungeon', quest: 'The Duergar\'s Tewel', location: 'Amh Araeng (28.1, 9.5)' },
  { id: 'e16', sectionId: 'shb-lev', level: 79, unlock: 'Mt. Gulg', type: 'Dungeon', quest: 'The Crystarium\'s Resolve', location: 'Kholusia (12.6, 8.8)' },
  { id: 'e17', sectionId: 'shb-cap', level: 430, unlock: "Eden's Gate: Resurrection", type: 'Raid', quest: 'Deep Dive', location: 'The Crystarium (10.1, 11.9)' },
  { id: 'e18', sectionId: 'shb-cap', level: 450, unlock: "Eden's Gate: Resurrection (Savage)", type: 'Raid', quest: 'Deep Dive', location: 'The Crystarium (10.1, 11.9)', notes: 'Optional challenge content.', optionalChallenge: true },
  { id: 'e19', sectionId: 'shb-cap', level: 470, unlock: 'The Epic of Alexander (Ultimate)', type: 'Trial', quest: 'Eyes on Me', location: 'The Crystarium (10.4, 11.4)', notes: 'Optional challenge content. Requires clearing a Savage tier.', optionalChallenge: true },
  { id: 'e20', sectionId: 'shb-cap', level: 0, unlock: 'The Bozjan Southern Front', type: 'Game Mechanic', quest: 'Hope on the Horizon', location: 'Gangos (33.8, 15.6)', isNew: true, notes: 'Field operation. Also unlocks the Resistance Weapons quests.' },
];

export interface Character {
  id: string;
  name: string;
  world: string;
  level: number;
}

export const characters: Character[] = [
  { id: 'c1', name: 'Aerin Valcour', world: 'Gilgamesh', level: 80 },
  { id: 'c2', name: 'Aerin Valcour', world: 'Ragnarok', level: 72 },
];
