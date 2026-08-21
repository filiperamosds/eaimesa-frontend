"use client";

import { useEffect, useId, useState } from "react";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function TablePinReveal({
  pin,
  tableLabel,
  className = "",
}: {
  pin: string | null | undefined;
  tableLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!pin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-current hover:bg-current/15 ${className}`}
        aria-label="Ver PIN da mesa"
      >
        <EyeIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div className="surface w-full max-w-sm p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">PIN da mesa</p>
            <h2 id={titleId} className="mt-2 font-serif text-2xl">
              {tableLabel ?? "Sua mesa"}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Outros na mesa entram com este código e abrem a própria comanda.
            </p>
            <div
              className="mx-auto mt-6 max-w-xs rounded-3xl border-2 border-chili/30 px-6 py-8"
              aria-label={`PIN da mesa: ${pin.split("").join(" ")}`}
            >
              <p className="font-serif text-5xl tracking-[0.35em] text-chili">{pin}</p>
            </div>
            <button type="button" className="btn-primary mt-6 w-full !py-2 text-sm" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
