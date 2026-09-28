"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
  className?: string;
};

export default function BackButton({
  label = "← Back",
  className = "",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {label}
    </button>
  );
}
