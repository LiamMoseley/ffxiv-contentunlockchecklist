// PROTOTYPE sample data: 22 rows copied by hand from the community wiki's Content Unlock page
// (Stormblood and Shadowbringers tables, copied 2026-11-03). Icons are hotlinked from the wiki for the prototype only.

export interface Entry {
  id: string;
  sectionId: string;
  level: string; // Level column; in a level-cap section this is the item level ("310-320"), "-" when blank
  itemLevel?: string; // levelling sections from Stormblood on also carry an iLevel column
  unlock: string;
  unlockIcon?: string; // e.g. a job's frame icon
  type: string;
  typeIcon?: string;
  quest?: string;
  questIcon?: string;
  location: string;
  notes?: string;
  noteIcons?: string[];
  noteLinks?: string[]; // phrases in the notes that the wiki links
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

const W = 'https://ffxiv.consolegameswiki.com/mediawiki/images/';
export const icon = {
  dungeon: W + 'f/fc/Dungeons_icon1.png',
  trial: W + '3/33/Trials_icon1.png',
  raid: W + 'f/f8/Raids_icon1.png',
  deepDungeon: W + '5/5b/Deep_dungeons_icon1.png',
  alliedSociety: W + '5/5d/Allied_society_quests_icon1.png',
  msq: W + '8/87/Main_Scenario_Quest_icon.png',
  feature: W + 'd/de/Feature_Quest_icon.png',
  stoneSkySea: W + '6/62/Stone_Sky_Sea_icon1.png',
  deepDungeonNote: W + '6/61/Deep_Dungeon.png',
  reaper: W + '3/39/Reaper_frame_icon.png',
  viper: W + 'f/f8/Viper_frame_icon.png',
};

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

const MSQ_SB = 'Unlocks as part of the main Stormblood quests';
const MSQ_SHB = 'Unlocks as part of the main Shadowbringers quests';

export const entries: Entry[] = [
  // Stormblood · Level 61–70
  { id: 'e1', sectionId: 'sb-lev', level: '61', itemLevel: '240', unlock: 'The Sirensong Sea', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'Not without Incident', questIcon: icon.msq, location: 'Mor Dhona (X:22.2, Y:8.5)', notes: MSQ_SB },
  { id: 'e2', sectionId: 'sb-lev', level: '61', unlock: 'Heaven-on-High', type: 'Deep Dungeon', typeIcon: icon.deepDungeon, quest: "Knocking on Heaven's Door", questIcon: icon.feature, location: 'The Ruby Sea (X:6.2, Y:11.7)', notes: 'Must have cleared Palace of the Dead floor 50', noteIcons: [icon.deepDungeonNote] },
  { id: 'e3', sectionId: 'sb-lev', level: '63', unlock: 'The Pool of Tribute', type: 'Trial', typeIcon: icon.trial, quest: 'The Lord of the Revel', questIcon: icon.msq, location: 'The Ruby Sea (X:5.5, Y:24.4)', notes: MSQ_SB },
  { id: 'e4', sectionId: 'sb-lev', level: '63', unlock: 'Kojin Daily Quests', type: 'Allied Society Quests', typeIcon: icon.alliedSociety, quest: 'Heaven-sent', questIcon: icon.feature, location: 'The Ruby Sea (X:6.8, Y:13.3)', notes: 'Daily quests for Kojin. Requires Tide Goes in, Imperials Go Out', noteIcons: [icon.msq], isNew: true },
  { id: 'e5', sectionId: 'sb-lev', level: '67', itemLevel: '255', unlock: 'Doma Castle', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'The Die Is Cast', questIcon: icon.msq, location: 'Yanxia (X:24.9, Y:12.8)', notes: MSQ_SB },
  { id: 'e6', sectionId: 'sb-lev', level: '70', unlock: 'The Circles of Answering', unlockIcon: icon.stoneSkySea, type: 'Game Mechanic', quest: 'Another Striking Opportunity', questIcon: icon.feature, location: "Rhalgr's Reach (X:12.3, Y:13.1)", notes: 'DPS Check for various Raids and Trials' },
  // Stormblood · Level 70
  { id: 'e7', sectionId: 'sb-cap', level: '-', unlock: 'Reaper', unlockIcon: icon.reaper, type: 'Job Unlock', quest: 'The Killer Instinct', questIcon: icon.feature, location: "Ul'dah - Steps of Nald (X:13, Y:9)", notes: 'Requires the expansion Endwalker to accept the quest in Ul\'dah.' },
  { id: 'e8', sectionId: 'sb-cap', level: '280', unlock: 'Ala Mhigo', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'Stormblood', questIcon: icon.msq, location: 'The Lochs (x33.1-22.8)', notes: MSQ_SB },
  { id: 'e9', sectionId: 'sb-cap', level: '-', unlock: 'The Forbidden Land, Eureka', type: 'Field Operations', quest: 'And We Shall Call it Eureka', questIcon: icon.feature, location: "Rhalgr's Reach (X:9.8, Y:12.5)", notes: 'Requires Stormblood', noteIcons: [icon.msq], isNew: true },
  { id: 'e10', sectionId: 'sb-cap', level: '310-320', unlock: 'Omega: Deltascape (Savage)', type: 'Raid', typeIcon: icon.raid, location: "Rhalgr's Reach (X:13.5, Y:12.4)", notes: '(Optional challenge content) Access the Magitek Terminal; requires The Anomaly', noteIcons: [icon.feature], optionalChallenge: true },
  { id: 'e11', sectionId: 'sb-cap', level: '320', unlock: 'The Unending Coil of Bahamut (Ultimate)', type: 'Ultimate Raid', typeIcon: icon.raid, location: 'Kugane (X:11.6, Y:12.6)', notes: '(Optional challenge content) Talk to the Wandering Minstrel; requires Deltascape V4.0 (Savage)', optionalChallenge: true },
  // Shadowbringers · Level 71–80
  { id: 'e12', sectionId: 'shb-lev', level: '71', itemLevel: '370', unlock: 'Holminster Switch', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'The Lightwardens', questIcon: icon.msq, location: 'The Ocular (X:6.1, Y:5.9)', notes: MSQ_SHB },
  { id: 'e13', sectionId: 'shb-lev', level: '73', itemLevel: '375', unlock: 'Dohn Mheg', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'The Key to the Castle', questIcon: icon.msq, location: 'Il Mheg (X:14.3, Y:31.1)', notes: MSQ_SHB },
  { id: 'e14', sectionId: 'shb-lev', level: '73', unlock: 'The Dancing Plague', type: 'Trial', typeIcon: icon.trial, quest: 'Acht-la Ormh Inn', questIcon: icon.msq, location: 'Il Mheg (X:30.5, Y:7.6)', notes: MSQ_SHB, isNew: true },
  { id: 'e15', sectionId: 'shb-lev', level: '73', unlock: 'Pixie Daily Quests', type: 'Allied Society Quests', typeIcon: icon.alliedSociety, quest: 'Manic Pixie Dream Realm', questIcon: icon.feature, location: 'The Crystarium (X:13.1, Y:15.3)', notes: 'Daily quests for Pixies. Requires The Wheel Turns', noteIcons: [icon.msq] },
  { id: 'e16', sectionId: 'shb-lev', level: '79', itemLevel: '390', unlock: 'Mt. Gulg', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'Extinguishing the Last Light', questIcon: icon.msq, location: 'Kholusia (X:18.6, Y:17.7)', notes: MSQ_SHB },
  // Shadowbringers · Level 80
  { id: 'e17', sectionId: 'shb-cap', level: '-', unlock: 'Viper', unlockIcon: icon.viper, type: 'Job Unlock', quest: 'Enter the Viper', questIcon: icon.feature, location: "Ul'dah - Steps of Nald (X:9.3, Y:9.2)", notes: "Requires the expansion Dawntrail to accept the quest in Ul'dah.", isNew: true },
  { id: 'e18', sectionId: 'shb-cap', level: '410', unlock: 'Amaurot', type: 'Dungeon', typeIcon: icon.dungeon, quest: 'Shadowbringers', questIcon: icon.msq, location: 'The Tempest (X:16.5, Y:30.4)', notes: MSQ_SHB },
  { id: 'e19', sectionId: 'shb-cap', level: '425', unlock: "Eden's Gate", type: 'Raid', typeIcon: icon.raid, quest: 'In the Middle of Nowhere', questIcon: icon.feature, location: 'The Crystarium (X:9.7, Y:12.3)', notes: 'Speak with Anxious Crystarium Guard; part of Eden Quests', isNew: true },
  { id: 'e20', sectionId: 'shb-cap', level: '-', unlock: 'The Bozjan Southern Front', type: 'Field Operations', quest: 'Where Eagles Nest', questIcon: icon.feature, location: 'Gangos (X:5.5, Y:5.4)', notes: 'Requires Vows of Virtue, Deeds of Cruelty, The Bozja Incident, and Fire in the Forge.', noteIcons: [icon.msq, icon.feature, icon.feature], isNew: true },
  { id: 'e21', sectionId: 'shb-cap', level: '440-450', unlock: "Eden's Gate (Savage)", type: 'Raid', typeIcon: icon.raid, location: 'Amh Araeng (X:26.8, Y:16.4)', notes: '(Optional challenge content) Speak with Lewrey', optionalChallenge: true },
  { id: 'e22', sectionId: 'shb-cap', level: '475', unlock: 'The Epic of Alexander (Ultimate)', type: 'Ultimate Raid', typeIcon: icon.raid, location: 'Kugane (X:11.6, Y:12.6)', notes: "(Optional challenge content) Talk to the Wandering Minstrel; requires Eden's Gate: Sepulture (Savage)", optionalChallenge: true },
];

// Which phrases in each row's Information cell are links on the wiki
const noteLinks: Record<string, string[]> = {
  e1: ['Stormblood'], e2: ['Palace of the Dead'], e3: ['Stormblood'], e4: ['Kojin', 'Tide Goes in, Imperials Go Out'],
  e5: ['Stormblood'], e6: ['Raids', 'Trials'], e7: ['Endwalker', "Ul'dah"], e8: ['Stormblood'], e9: ['Stormblood'],
  e10: ['Magitek Terminal', 'The Anomaly'], e11: ['Wandering Minstrel', 'Deltascape V4.0 (Savage)'],
  e12: ['Shadowbringers'], e13: ['Shadowbringers'], e14: ['Shadowbringers'], e15: ['Pixies', 'The Wheel Turns'],
  e16: ['Shadowbringers'], e17: ['Dawntrail', "Ul'dah"], e18: ['Shadowbringers'], e19: ['Anxious Crystarium Guard', 'Eden Quests'],
  e20: ['Vows of Virtue, Deeds of Cruelty', 'The Bozja Incident', 'Fire in the Forge'], e21: ['Lewrey'],
  e22: ['Wandering Minstrel', "Eden's Gate: Sepulture (Savage)"],
};
for (const e of entries) e.noteLinks = noteLinks[e.id];

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
