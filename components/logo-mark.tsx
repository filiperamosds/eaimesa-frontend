import { BRAND } from "../lib/brand";

export type LogoMarkVariant = "brand" | "inverse";

/** Símbolo: balão + cloche + raios. `brand` no papel; `inverse` no chili ou no night. */
export function LogoMark({
  className = "h-9 w-9",
  variant = "brand",
}: {
  className?: string;
  variant?: LogoMarkVariant;
}) {
  const bubble = variant === "brand" ? BRAND.chili : BRAND.paper;
  const cloche = variant === "brand" ? BRAND.paper : BRAND.ink;
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden fill="none">
      <g stroke={bubble} strokeWidth="2.3" strokeLinecap="round">
        <path d="M48.6 11 L52.4 5.6" />
        <path d="M53.4 13.8 L59 9.4" />
        <path d="M55 19 L61.2 18.2" />
      </g>
      <ellipse cx="30.2" cy="35.4" rx="22.4" ry="22.4" fill={bubble} />
      <path fill={bubble} d="M16.8 51 L5.8 62 L25.2 55.2Z" />
      <circle cx="30.2" cy="28.25" r="2.15" fill={cloche} />
      <rect x="29.15" y="29.1" width="2.1" height="3.2" fill={cloche} />
      <path fill={cloche} d="M21.4 41.6A8.8 12.2 0 0 0 39 41.6Z" />
      <rect x="19.2" y="41.4" width="22" height="3.4" rx="1.7" fill={cloche} />
    </svg>
  );
}
