/** The Blackbox mark from the prototype. `defs` renders once (in the nav); the footer reuses them. */
export function Logo({ size = 26, defs = false }: { size?: number; defs?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      {defs && (
        <defs>
          <linearGradient id="lgb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FF9A57" />
            <stop offset="1" stopColor="#FF5F1A" />
          </linearGradient>
          <clipPath id="lgc">
            <rect x="1" y="4" width="24" height="18" rx="6" />
          </clipPath>
        </defs>
      )}
      <rect x="1" y="4" width="24" height="18" rx="6" fill="url(#lgb)" />
      <g clipPath="url(#lgc)">
        <path d="M8 25L15 1h3.2L11.2 25zM15.5 25L22.5 1h2.2L17.7 25z" fill="#fff" opacity=".85" />
      </g>
      {defs && (
        <rect x="1.5" y="4.5" width="23" height="17" rx="5.5" fill="none" stroke="rgba(255,255,255,.35)" />
      )}
    </svg>
  );
}
