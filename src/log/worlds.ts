/**
 * The game's Data Centers and their Worlds, bundled so choosing a World can fill in its Data Center.
 * The list changes occasionally; a World missing here can still be typed in.
 */
export const DATA_CENTERS: Record<string, string[]> = {
  Elemental: ["Aegis", "Atomos", "Carbuncle", "Garuda", "Gungnir", "Kujata", "Tonberry", "Typhon"],
  Gaia: ["Alexander", "Bahamut", "Durandal", "Fenrir", "Ifrit", "Ridill", "Tiamat", "Ultima"],
  Mana: ["Anima", "Asura", "Chocobo", "Hades", "Ixion", "Masamune", "Pandaemonium", "Titan"],
  Meteor: ["Belias", "Mandragora", "Ramuh", "Shinryu", "Unicorn", "Valefor", "Yojimbo", "Zeromus"],
  Aether: ["Adamantoise", "Cactuar", "Faerie", "Gilgamesh", "Jenova", "Midgardsormr", "Sargatanas", "Siren"],
  Crystal: ["Balmung", "Brynhildr", "Coeurl", "Diabolos", "Goblin", "Malboro", "Mateus", "Zalera"],
  Dynamis: ["Cuchulainn", "Golem", "Halicarnassus", "Kraken", "Maduin", "Marilith", "Rafflesia", "Seraph"],
  Primal: ["Behemoth", "Excalibur", "Exodus", "Famfrit", "Hyperion", "Lamia", "Leviathan", "Ultros"],
  Chaos: ["Cerberus", "Louisoix", "Moogle", "Omega", "Phantom", "Ragnarok", "Sagittarius", "Spriggan"],
  Light: ["Alpha", "Lich", "Odin", "Phoenix", "Raiden", "Shiva", "Twintania", "Zodiark"],
  Materia: ["Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan"],
};

/** Every known World, alphabetically. */
export const WORLDS: string[] = Object.values(DATA_CENTERS)
  .flat()
  .sort((a, b) => a.localeCompare(b));

/** A World as the table spells it, ignoring case and spacing; null for a World not in the table. */
export function knownWorld(world: string): string | null {
  const wanted = world.trim().toLowerCase();
  return WORLDS.find((w) => w.toLowerCase() === wanted) ?? null;
}

/** The Data Center of a known World; null for a World not in the table. */
export function dataCenterOfWorld(world: string): string | null {
  const known = knownWorld(world);
  return known && (Object.entries(DATA_CENTERS).find(([, worlds]) => worlds.includes(known))?.[0] ?? null);
}
