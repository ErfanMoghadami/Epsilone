import type { ReactNode } from "react";

import Select from "@/components/ui/Select";
import { musicalKey } from "@/lib/uploadConfig";
import { MOODS } from "@/lib/taxonomy";
import type { Facets, Filters } from "@/lib/discover";

const labelClass = "mb-2 block text-xs font-medium text-zinc-500";

const inputClass =
  "rounded-xl border border-zinc-800 bg-black px-3 py-3 text-sm outline-none";

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "popular", label: "پرپخش‌ترین" },
  { value: "price_asc", label: "قیمت: کم به زیاد" },
  { value: "price_desc", label: "قیمت: زیاد به کم" },
  { value: "bpm_asc", label: "BPM: کم به زیاد" },
  { value: "bpm_desc", label: "BPM: زیاد به کم" },
];

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
  const genreOptions = [
    { value: "", label: "همه‌ی ژانرها" },
    ...facets.genres.map((genre) => ({ value: genre, label: genre })),
  ];

  const producerOptions = [
    { value: "", label: "همه‌ی تولیدکننده‌ها" },
    ...facets.producers.map((producer) => ({
      value: producer.id,
      label: `${producer.display_name || producer.username || "Producer"}${
        producer.username ? ` (@${producer.username})` : ""
      }`,
    })),
  ];

  const keyOptions = [
    { value: "", label: "همه‌ی کلیدها" },
    ...(facets.keys.length > 0 ? facets.keys : musicalKey).map((item) => ({
      value: item,
      label: item,
    })),
  ];

  return (
    <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label="ژانر">
          <Select
            value={filters.genre}
            onChange={(value) => onChange("genre", value)}
            options={genreOptions}
            ariaLabel="ژانر"
          />
        </Field>

        <Field label="تولیدکننده">
          <Select
            value={filters.producer}
            onChange={(value) => onChange("producer", value)}
            options={producerOptions}
            ariaLabel="تولیدکننده"
          />
        </Field>

        <Field label="کلید موسیقی">
          <Select
            value={filters.key}
            onChange={(value) => onChange("key", value)}
            options={keyOptions}
            ariaLabel="کلید موسیقی"
          />
        </Field>

        <Field label="مرتب‌سازی">
          <Select
            value={filters.sort}
            onChange={(value) => onChange("sort", value)}
            options={SORT_OPTIONS}
            ariaLabel="مرتب‌سازی"
          />
        </Field>

        <Field label="BPM">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={20}
              max={300}
              value={filters.bpmMin}
              onChange={(e) => onChange("bpmMin", e.target.value)}
              placeholder="حداقل"
              className={inputClass}
            />
            <input
              type="number"
              min={20}
              max={300}
              value={filters.bpmMax}
              onChange={(e) => onChange("bpmMax", e.target.value)}
              placeholder="حداکثر"
              className={inputClass}
            />
          </div>
        </Field>

        <Field label="قیمت">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.priceMin}
              onChange={(e) => onChange("priceMin", e.target.value)}
              placeholder="حداقل"
              className={inputClass}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              value={filters.priceMax}
              onChange={(e) => onChange("priceMax", e.target.value)}
              placeholder="حداکثر"
              className={inputClass}
            />
          </div>
        </Field>

        <Field label="تگ‌ها">
          <input
            type="text"
            dir="auto"
            value={filters.tags}
            onChange={(e) => onChange("tags", e.target.value)}
            placeholder="dark, nocturnal, trap"
            className={`w-full ${inputClass} placeholder:text-zinc-700`}
          />

          <p className="mt-2 text-[11px] text-zinc-600">
            چند تگ را با کاما جدا کنید.
          </p>
        </Field>
      </div>

      {/* Mood */}
      <div className="mt-6 border-t border-zinc-900 pt-5">
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-500">مود</p>

          <p className="mt-1 text-xs text-zinc-700">
            یک یا چند مورد را انتخاب کنید.
          </p>
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
          اعمال فیلترها
        </button>
      </div>
    </section>
  );
}