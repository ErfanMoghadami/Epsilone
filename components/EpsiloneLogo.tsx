import Image from "next/image";
import logo from "../public/logo.svg";

export default function EpsiloneLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <Image
      src={logo}
      alt="Epsilone"
      priority
      className={`logo-adaptive h-auto w-full ${className}`}
    />
  );
}


