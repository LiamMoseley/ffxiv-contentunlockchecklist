/**
 * The Update-from-the-wiki button, disabled with a red dot while the device is offline. On a phone the CSS shows
 * its "Update from wiki" label beside the icon; elsewhere it is the icon alone.
 */
export function UpdateButton({ online, onClick }: { online: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="update-button"
      disabled={!online}
      aria-label={online ? "Update from the wiki" : "Update from the wiki (offline)"}
      title={online ? "Update from the wiki" : "You're offline: Update needs the wiki"}
      onClick={onClick}
    >
      <svg className="update-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        <path d="M6 1h2v6h2.5L7 10.5 3.5 7H6V1ZM2 11.5h10V13H2v-1.5Z" />
      </svg>
      <span className="update-label" aria-hidden="true">
        Update from wiki
      </span>
      {!online && <span className="update-offline-dot" aria-hidden="true" />}
    </button>
  );
}
