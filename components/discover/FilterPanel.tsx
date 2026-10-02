import type { ReactNode } from "react";

import { musicalKey } from "@/lib/uploadConfig";
import { MOODS } from "@/lib/taxonomy";
import type { Facets, Filters } from "@/lib/discover";

const labelClass =
  "mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-500";

const selectClass =
  "w-full rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none";

const inputClass =
  "rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

type FilterPanelProps = {
  filters: Filters;
  facets: Facets;
  loading: boolean;
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onToggleMood: (mood: string) => void;
  onApply: () => void;
};

export default function FilterPanel({
  filters,
  facets,
  loading,
  onChange,
  onToggleMood,
  onApply,
}: FilterPanelProps) {
  return (
    <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Genre">
          <select
            value={filters.genre}
            onChange={(e) => onChange("genre", e.target.value)}
            className={selectClass}
          >
            <option value="">All genres</option>
            {facets.genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Producer">
          <select
            value={filters.producer}
            onChange={(e) => onChange("producer", e.target.value)}
            className={selectClass}
          >
            <option value="">All producers</option>
            {facets.producers.map((producer) => (
              <option key={producer.id} value={producer.id}>
                {producer.display_name || producer.username || "Producer"}
                {producer.username ? ` (@${producer.username})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Key">
          <select
            value={filters.key}
            onChange={(e) => onChange("key", e.target.value)}
            className={selectClass}
          >
            <option value="">All keys</option>
            {(facets.keys.length > 0 ? facets.keys : musicalKey).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sort">
          <select
            value={filters.sort}
            onChange={(e) => onChange("sort", e.target.value)}
            className={selectClass}
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Played</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="bpm_asc">BPM: Low to High</option>
            <option value="bpm_desc">BPM: High to Low</option>
          </select>
        </Field>

        <Field label="BPM">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={20}
              max={300}
              value={filters.bpmMin}
              onChange={(e) => onChange("bpmMin", e.target.value)}
              placeholder="Min"
              className={inputClass}
            />
            <input
              type="number"
              min={20}
              max={300}
              value={filters.bpmMax}
              onChange={(e) => onChange("bpmMax", e.target.value)}
              placeholder="Max"
              className={inputClass}
            />
          </div>
        </Field>

        <Field label="Price">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.priceMin}
              onChange={(e) => onChange("priceMin", e.target.value)}
              placeholder="Min"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.priceMax}
              onChange={(e) => onChange("priceMax", e.target.value)}
              placeholder="Max"
              className={inputClass}
            />
          </div>
        </Field>

        <Field label="Tags">
          <input
            type="text"
            value={filters.tags}
            onChange={(e) => onChange("tags", e.target.value)}
            placeholder="dark, nocturnal, trap"
            className={`w-full ${inputClass} placeholder:text-zinc-700`}
          />

          <p className="mt-2 text-[11px] text-zinc-600">
            Separate multiple tags with commas.
          </p>
        </Field>
      </div>

      {/* Mood */}
      <div className="mt-6 border-t border-zinc-900 pt-5">
        <div className="mb-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Mood
          </p>

          <p className="mt-1 text-xs text-zinc-700">Select one or more.</p>
        </div>

        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
          {MOODS.map((mood) => {
            const active = filters.moods.includes(mood);

            return (
              <button
                key={mood}
                type="button"
                onClick={() => onToggleMood(mood)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {mood}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Filters
        </button>
      </div>
    </section>
  );
}