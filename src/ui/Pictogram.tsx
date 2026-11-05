/** Plain geometric pictograms for the expansion tiles, drawn here: none of the game's artwork. */
const PATHS: Record<string, string> = {
  // Sun rising: A Realm Reborn
  arr: "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zM11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM4.2 5.6l1.4-1.4 2.8 2.8-1.4 1.4zM15.6 17l1.4-1.4 2.8 2.8-1.4 1.4zM4.2 18.4l2.8-2.8 1.4 1.4-2.8 2.8zM15.6 7l2.8-2.8 1.4 1.4-2.8 2.8z",
  // Spire: Heavensward
  hw: "M12 1l4 9h-2l3 6h-2l2 7H7l2-7H7l3-6H8z",
  // Lightning: Stormblood
  sb: "M13 2 5 13h5l-2 9 9-12h-5l1-8z",
  // Crystal: Shadowbringers
  shb: "M12 2 4 10l8 12 8-12-8-8zm0 3.2L17 10l-5 7.5L7 10l5-4.8z",
  // Crescent: Endwalker
  ew: "M14.5 2.5a9.5 9.5 0 1 0 7 13.6A7.5 7.5 0 0 1 14.5 2.5z",
  // Sun on the horizon: Dawntrail
  dt: "M6 15a6 6 0 0 1 12 0zM2 16.5h20v2H2zM5 20.5h14v2H5zM11 3h2v4h-2zM3.5 7l1.4-1.4 2.8 2.8-1.4 1.4zM16.3 8.4l2.8-2.8 1.4 1.4-2.8 2.8z",
  // Four squares: every expansion
  all: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
};

export function Pictogram({ name }: { name: string }) {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.all} fillRule="evenodd" />
    </svg>
  );
}
