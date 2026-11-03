// PROTOTYPE shared bits: variant switcher, confirm dialog, simple pictograms.
// Pictograms are plain geometric shapes drawn here, not game artwork.
import { useEffect, useState, type ReactNode } from 'react';

export function Pictogram({ name, size = 20 }: { name: string; size?: number }) {
  const p: Record<string, ReactNode> = {
    sb: <path d="M13 2 5 13h5l-2 9 9-12h-5l1-8z" />,
    shb: <path d="M12 2 4 10l8 12 8-12-8-8zm0 3.2L17 10l-5 7.5L7 10l5-4.8z" />,
    all: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
    Dungeon: <path d="M5 21V10a7 7 0 0 1 14 0v11h-4v-7a3 3 0 0 0-6 0v7H5z" />,
    Trial: <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-3 0-6 1-9z" />,
    Raid: <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4zm0 4 5 2v4c0 3-2 6-5 7-3-1-5-4-5-7V8l5-2z" />,
    'Job Unlock': <path d="m12 2 3 7 7 .6-5.3 4.6 1.6 7.1L12 17.6 5.7 21.3l1.6-7.1L2 9.6 9 9z" />,
    'Game Mechanic': <path d="M10.3 2h3.4l.5 2.6 2 .9 2.2-1.5 2.4 2.4-1.5 2.2.9 2 2.6.5v3.4l-2.6.5-.9 2 1.5 2.2-2.4 2.4-2.2-1.5-2 .9-.5 2.6h-3.4l-.5-2.6-2-.9-2.2 1.5-2.4-2.4 1.5-2.2-.9-2L2 13.7v-3.4l2.6-.5.9-2L4 5.6 6.4 3.2l2.2 1.5 2-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {p[name] ?? (name.includes('Raid') ? p.Raid : name.includes('Dungeon') ? p.Dungeon : p['Game Mechanic'])}
    </svg>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<{ title: string; body: string; ok: () => void } | null>(null);
  const ask = (title: string, body: string, ok: () => void) => setPending({ title, body, ok });
  const dialog = pending && (
    <div className="proto-modal-backdrop" onClick={() => setPending(null)}>
      <div className="proto-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{pending.title}</h2>
        <p>{pending.body}</p>
        <div className="proto-modal-actions">
          <button onClick={() => setPending(null)}>Cancel</button>
          <button
            className="primary"
            autoFocus
            onClick={() => {
              pending.ok();
              setPending(null);
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
  return { ask, dialog };
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? (
    <div className="proto-toast" role="status">
      {msg}
    </div>
  ) : null;
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
}) {
  const i = Math.max(0, variants.findIndex((v) => v.key === current));
  const go = (d: number) => onChange(variants[(i + d + variants.length) % variants.length].key);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (import.meta.env.PROD) return null;
  return (
    <div className="proto-switcher" aria-label="Prototype variant switcher">
      <button onClick={() => go(-1)} aria-label="Previous variant">
        ←
      </button>
      <span>
        <b>{variants[i].key}</b> {variants[i].name}
      </span>
      <button onClick={() => go(1)} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
