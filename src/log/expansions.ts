export type Expansion = {
  id: string;
  name: string;
  shortName: string;
  /** Lowest character level of the expansion's levelling section. */
  minLevel: number;
  levelCap: number;
};

export const EXPANSIONS: readonly Expansion[] = [
  { id: "arr", name: "A Realm Reborn", shortName: "ARR", minLevel: 1, levelCap: 50 },
  { id: "hw", name: "Heavensward", shortName: "HW", minLevel: 51, levelCap: 60 },
  { id: "sb", name: "Stormblood", shortName: "SB", minLevel: 61, levelCap: 70 },
  { id: "shb", name: "Shadowbringers", shortName: "ShB", minLevel: 71, levelCap: 80 },
  { id: "ew", name: "Endwalker", shortName: "EW", minLevel: 81, levelCap: 90 },
  { id: "dt", name: "Dawntrail", shortName: "DT", minLevel: 91, levelCap: 100 },
];
