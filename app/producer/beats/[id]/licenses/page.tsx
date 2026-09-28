"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type LicenseType = "Basic" | "Premium" | "Exclusive";

type License = {
  id?: string;
  beat_id: string;
  license_type: LicenseType;
  price: number;
  currency: string;
  is_active: boolean;
};

const DEFAULT_LICENSES: License[] = [
  {
    beat_id: "",
    license_type: "Basic",
    price: 10,
    currency: "USD",
    is_active: true,
  },
  {
    beat_id: "",
    license_type: "Premium",
    price: 25,
    currency: "USD",
    is_active: true,
  },
  {
    beat_id: "",
    license_type: "Exclusive",
    price: 50,
    currency: "USD",
    is_active: true,
  },
];

const LICENSE_DESCRIPTIONS: Record<LicenseType, string> = {
  Basic: "Standard license for regular beat usage.",
  Premium: "Extended license for broader commercial usage.",
  Exclusive: "Exclusive ownership-style license for the buyer.",
};

export default function LicensesPage() {
  const params = useParams();
  const router = useRouter();

  const beatId = params.id as string;

  const [beatTitle, setBeatTitle] = useState("");
  const [licenses, setLicenses] = useState<License[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadLicenses() {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/producer/login");
        return;
      }

      const { data: beat, error: beatError } = await supabase
        .from("beats")
        .select("id, title")
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (beatError || !beat) {
        setError("Beat not found or you do not have access to it.");
        setIsLoading(false);
        return;
      }

      setBeatTitle(beat.title ?? "Untitled Beat");

      const { data: existingLicenses, error: licenseError } =
        await supabase
          .from("beat_licenses")
          .select(
            "id, beat_id, license_type, price, currency, is_active",
          )
          .eq("beat_id", beatId)
          .order("id", { ascending: true });

      if (licenseError) {
        console.error(licenseError);
        setError(licenseError.message);
        setIsLoading(false);
        return;
      }

      const existingByType = new Map(
        (existingLicenses ?? []).map((license) => [
          license.license_type,
          license,
        ]),
      );

      const mergedLicenses = DEFAULT_LICENSES.map((defaultLicense) => {
        const existing = existingByType.get(
          defaultLicense.license_type,
        );

        if (!existing) {
          return {
            ...defaultLicense,
            beat_id: beatId,
          };
        }

        return {
          id: existing.id,
          beat_id: existing.beat_id,
          license_type:
            existing.license_type as LicenseType,
          price: Number(existing.price),
          currency: existing.currency ?? "USD",
          is_active: existing.is_active,
        };
      });

      setLicenses(mergedLicenses);
      setIsLoading(false);
    }

    if (beatId) {
      loadLicenses();
    }
  }, [beatId, router]);

  function updateLicense(
    licenseType: LicenseType,
    field: "price" | "is_active",
    value: number | boolean,
  ) {
    setLicenses((previous) =>
      previous.map((license) =>
        license.license_type === licenseType
          ? {
              ...license,
              [field]: value,
            }
          : license,
      ),
    );

    setSuccess(null);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    for (const license of licenses) {
      if (
        !Number.isFinite(license.price) ||
        license.price <= 0
      ) {
        setError(
          `${license.license_type} price must be greater than 0.`,
        );
        return;
      }
    }

    setIsSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in.");
      }

      const { data: beat, error: beatError } = await supabase
        .from("beats")
        .select("id")
        .eq("id", beatId)
        .eq("producer_id", user.id)
        .single();

      if (beatError || !beat) {
        throw new Error(
          "Beat not found or you do not have access to it.",
        );
      }

      const rows = licenses.map((license) => ({
        beat_id: beatId,
        license_type: license.license_type,
        price: Number(license.price.toFixed(2)),
        currency: "USD",
        is_active: license.is_active,
      }));

      const { error: upsertError } = await supabase
        .from("beat_licenses")
        .upsert(rows, {
          onConflict: "beat_id,license_type",
        });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setSuccess("License settings saved successfully.");
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save license settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <p className="text-zinc-400">
          Loading license settings...
        </p>
      </div>
    );
  }

  if (error && licenses.length === 0) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back
          </button>

          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 text-sm text-zinc-400 transition hover:text-white"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-bold">
            License & Pricing
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            {beatTitle}
          </p>
        </div>

        <div className="space-y-4">
          {licenses.map((license) => (
            <div
              key={license.license_type}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    {license.license_type}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {
                      LICENSE_DESCRIPTIONS[
                        license.license_type
                      ]
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateLicense(
                      license.license_type,
                      "is_active",
                      !license.is_active,
                    )
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    license.is_active
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {license.is_active
                    ? "Active"
                    : "Inactive"}
                </button>
              </div>

              <div className="mt-6">
                <label
                  htmlFor={`price-${license.license_type}`}
                  className="mb-2 block text-sm text-zinc-400"
                >
                  Price
                </label>

                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>

                  <input
                    id={`price-${license.license_type}`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={license.price}
                    onChange={(event) =>
                      updateLicense(
                        license.license_type,
                        "price",
                        Number(event.target.value),
                      )
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 pl-8 text-white outline-none transition focus:border-zinc-600"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving
              ? "Saving..."
              : "Save License Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}