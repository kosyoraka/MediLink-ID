import medilinkLogo from "../../../../src/assets/medilink-logo.png";

type MedilinkIconProps = {
  className?: string;
};

export function MedilinkIcon({ className = "h-12 w-12" }: MedilinkIconProps) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      role="img"
      aria-label="Medilink ID logo"
    >
      <defs>
        <clipPath id="medilink-circle-crop">
          <circle cx="80" cy="80" r="80" />
        </clipPath>
      </defs>
      <image
        href={medilinkLogo}
        x="0"
        y="0"
        width="444"
        height="160"
        preserveAspectRatio="xMinYMid slice"
        clipPath="url(#medilink-circle-crop)"
      />
    </svg>
  );
}
