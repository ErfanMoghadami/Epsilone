import Image from "next/image";
import logo from "../public/logo.svg";
export default function EpsiloneLogo({ className = "" }: { className?: string }) {
  return (
    <div>
      <Image src={logo} alt="logo"></Image>
    </div>
  );
}


