import Image from "next/image";
import logoLight from "../public/logo.svg";
import logoDark from "../public/logo-dark.svg";

/**
 * Wordmark: white letters in night mode, #121620 letters in day mode.
 * The orange "L" keeps its own color in both (two SVGs, no CSS filter).
 */
export default function EpsiloneLogo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <>
      <Image
        src={logoLight}
        alt="Epsilone"
        priority
        className={`hidden h-auto w-full dark:block ${className}`}
      />
      <Image
        src={logoDark}
        alt="Epsilone"
        priority
        className={`block h-auto w-full dark:hidden ${className}`}
      />
    </>
  );
}
