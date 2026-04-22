import medilinkLogo from "../../../../src/assets/medilink-logo.png";

type MedilinkIconProps = {
  className?: string;
};

export function MedilinkIcon({ className = "h-12 w-12" }: MedilinkIconProps) {
  return (
    <div
      className={`overflow-hidden rounded-full bg-no-repeat ${className}`.trim()}
      role="img"
      aria-label="Medilink ID logo"
      style={{
        backgroundImage: `url(${medilinkLogo})`,
        backgroundSize: "278% 100%",
        backgroundPosition: "left center",
      }}
    />
  );
}
