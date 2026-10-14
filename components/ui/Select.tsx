"use client";

import type { KeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** برای اتصال با <label htmlFor> */
  id?: string;
  /** کلاس‌های ظرف بیرونی (مثلاً عرض) */
  className?: string;
  /**
   * ظاهر کامل دکمه (شعاع، بوردر، رنگ، پدینگ).
   * اگه بدی، جایگزین ظاهر پیش‌فرض می‌شه.
   */
  buttonClassName?: string;
  ariaLabel?: string;
};

const DEFAULT_BUTTON_SKIN =
  "rounded-xl border-zinc-800 bg-black px-3 py-3 text-zinc-200 hover:border-white/25";

export default function Select({
  value,
  onChange,
  options,
  placeholder = "انتخاب کنید",
  disabled = false,
  id,
  className = "",
  buttonClassName = DEFAULT_BUTTON_SKIN,
  ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const openMenu = useCallback(() => {
    if (disabled || options.length === 0) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }, [disabled, options.length, selectedIndex]);

  // بستن با کلیک بیرون
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // گزینه‌ی فعال همیشه توی دید بمونه
  useEffect(() => {
    if (!open) return;

    const element = listRef.current?.children[activeIndex] as
      | HTMLElement
      | undefined;

    element?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;

    onChange(option.value);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((index) => Math.min(index + 1, options.length - 1));
        break;

      case "ArrowUp":
        event.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((index) => Math.max(index - 1, 0));
        break;

      case "Home":
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;

      case "End":
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;

      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) openMenu();
        else choose(activeIndex);
        break;

      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;

      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${open ? "z-30" : ""} ${className}`}
    >
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`flex w-full items-center justify-between gap-2 border text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "ring-2 ring-brand/40" : ""
        } ${buttonClassName}`}
      >
        <span
          dir="auto"
          className={`min-w-0 flex-1 truncate text-right ${
            selected ? "" : "text-zinc-500"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-brand" : "text-zinc-500"
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="select-menu rounded-xl"
          // اگه Select داخل <label> باشه، کلیک روی گزینه‌ها نباید دوباره دکمه رو فعال کنه
          onClick={(event) => event.preventDefault()}
        >
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="select-scroll max-h-60 overflow-y-auto p-1.5"
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;

              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-brand/15 text-brand"
                      : isActive
                        ? "bg-white/10 text-white"
                        : "text-zinc-300"
                  }`}
                >
                  <span dir="auto" className="min-w-0 flex-1 text-right">
                    {option.label}
                  </span>

                  {isSelected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="shrink-0"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}