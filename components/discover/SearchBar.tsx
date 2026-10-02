import type { FormEvent } from "react";

type SearchBarProps = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SearchBar({
  value,
  disabled,
  onChange,
  onSubmit,
}: SearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="mb-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search beat title, producer, genre, or tag..."
          className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-sm outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />

        <button
          type="submit"
          disabled={disabled}
          className="rounded-2xl bg-white px-7 py-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </div>
    </form>
  );
}