type MedilinkIconProps = {
  className?: string;
};

export function MedilinkIcon({ className = "h-12 w-12" }: MedilinkIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="MediLink ID logo"
    >
      <defs>
        <linearGradient id="medilink-id-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#228BE6" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      <circle cx="30" cy="30" r="27" fill="url(#medilink-id-icon-gradient)" />
      <rect x="25.5" y="13" width="9" height="34" rx="4.5" fill="white" />
      <rect x="13" y="25.5" width="34" height="9" rx="4.5" fill="white" />

      <circle cx="48" cy="48" r="12" fill="#10B981" stroke="white" strokeWidth="3" />
      <path
        d="M43.5 48c1.2-2 4-2.5 5.8-.8l.8.7m-6.6.1c1.2 2 4 2.5 5.8.8l.8-.7"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
