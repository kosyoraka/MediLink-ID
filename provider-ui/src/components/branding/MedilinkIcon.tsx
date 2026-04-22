import medilinkCircle from "../../assets/medilink-circle.png";

type MedilinkIconProps = {
  className?: string;
};

export function MedilinkIcon({ className = "h-12 w-12" }: MedilinkIconProps) {
  return (
    <img
      src={medilinkCircle}
      alt="Medilink ID logo"
      className={`${className} object-contain`.trim()}
    />
  );
}
