import Image from "next/image";
import mark from "../public/l.svg";

// The orange glass "L" mark (artwork: /public/l-mark.png).
// `glow` adds an orange halo in night mode only (see .mark-glow in globals.css).
export default function EpsiloneMark({
  className = "",
  glow = false,
  priority = false,
}: {
  className?: string;
  glow?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={mark}
      alt=""
      aria-hidden="true"
      priority={priority}
      draggable={false}
      className={`${glow ? "mark-glow " : ""}${className}`}
    />
  );
}
