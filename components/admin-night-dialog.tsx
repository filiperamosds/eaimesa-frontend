"use client";

import { useEffect, useId } from "react";

export function AdminNightDialog({
  title,
  kicker,
  pending,
  wide,
  extraWide,
  onClose,
  children,
}: {
  title: string;
  kicker?: string;
  pending?: boolean;
  wide?: boolean;
  extraWide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1614] p-5 shadow-xl ${
          extraWide ? "max-w-3xl" : wide ? "max-w-xl" : "max-w-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {kicker ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-amber">{kicker}</p>
        ) : null}
        <h2 id={titleId} className={`font-serif text-2xl ${kicker ? "mt-2" : ""}`}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
