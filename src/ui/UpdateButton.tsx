/** The Update-from-the-wiki button, disabled with a red dot while the device is offline. */
export function UpdateButton({
  online,
  onClick,
  className,
}: {
  online: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      className={`update-button ${className}`}
      disabled={!online}
      aria-label={online ? "Update from the wiki" : "Update from the wiki (offline)"}
      title={online ? "Update from the wiki" : "You're offline: Update needs the wiki"}
      onClick={onClick}
    >
      <svg className="update-icon" width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        <path d="M6 1h2v6h2.5L7 10.5 3.5 7H6V1ZM2 11.5h10V13H2v-1.5Z" />
      </svg>
      {!online && <span className="update-offline-dot" aria-hidden="true" />}
    </button>
  );
}
