type MedilinkWordmarkProps = {
  className?: string;
  iconOnly?: boolean;
};

export function MedilinkWordmark({ className = "", iconOnly = false }: MedilinkWordmarkProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`.trim()}>
      <svg
        viewBox="0 0 64 64"
        className="h-12 w-12 shrink-0"
        role="img"
        aria-label="MediLinkID logo icon"
      >
        <defs>
          <linearGradient id="medilink-provider-logo" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#228BE6" />
            <stop offset="100%" stopColor="#0EA5A8" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#medilink-provider-logo)" />
        <rect x="27.5" y="15" width="9" height="34" rx="4.5" fill="white" />
        <rect x="15" y="27.5" width="34" height="9" rx="4.5" fill="white" />
        <circle cx="48.5" cy="48.5" r="10.5" fill="#0EA5A8" stroke="white" strokeWidth="3" />
        <path
          d="M45.5 48.5h6M48.5 45.5v6"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>

      {!iconOnly ? (
        <div className="leading-none">
          <span className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-800">MediLink</span>
          <span className="text-[2rem] font-semibold tracking-[-0.03em] text-blue-600">ID</span>
        </div>
      ) : null}
    </div>
  );
}
