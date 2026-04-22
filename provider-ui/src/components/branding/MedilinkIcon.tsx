import medilinkLogo from "../../../../src/assets/medilink-logo.png";

type MedilinkIconProps = {
  className?: string;
};

export function MedilinkIcon({ className = "h-12 w-12" }: MedilinkIconProps) {
  return (
    <div className={`overflow-hidden rounded-full ${className}`.trim()}>
      <img
        src={medilinkLogo}
        alt="MediLink ID logo"
        className="h-full max-w-none object-cover object-left"
        style={{ width: "177.6px" }}
      />
    </div>
  );
}
