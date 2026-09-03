export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <rect x="13.7" y="5.3" width="4.6" height="2.9" rx="1.45" fill="currentColor" />
      <rect x="13.7" y="23.8" width="4.6" height="2.9" rx="1.45" fill="currentColor" />
      <rect x="5.3" y="13.7" width="2.9" height="4.6" rx="1.45" fill="currentColor" />
      <rect x="23.8" y="13.7" width="2.9" height="4.6" rx="1.45" fill="currentColor" />
      <ellipse cx="16" cy="16" rx="8.5" ry="5.7" fill="currentColor" />
      <g transform="rotate(-22 18.5 16.15)">
        <rect x="16.45" y="12.45" width="4.15" height="7.45" rx="0.95" fill="#161311" />
        <rect x="17" y="13.4" width="3.05" height="4.55" rx="0.35" fill="currentColor" />
        <circle cx="18.52" cy="18.85" r="0.38" fill="currentColor" />
      </g>
    </svg>
  );
}
