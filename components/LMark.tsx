import { L_MARK_PATH, L_MARK_VIEWBOX } from "@/components/lMarkPath";

/**
 * Inline "L" mark (same artwork as /public/l.svg).
 * - `animated`: the outline is drawn like a pen stroke, then the shape fills
 *   with the brand orange and glows (see .l-mark-* in globals.css).
 * - static: plain filled mark, used on error / 404 screens.
 */
export default function LMark({
  animated = false,
  className = "",
}: {
  animated?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox={L_MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className={`${animated ? "l-mark-animated " : "mark-glow "}${className}`}
    >
      {animated ? (
        <>
          <path className="l-mark-fill" d={L_MARK_PATH} />
          <path className="l-mark-stroke" d={L_MARK_PATH} pathLength={1} />
        </>
      ) : (
        <path d={L_MARK_PATH} fill="#EB875D" />
      )}
    </svg>
  );
}
