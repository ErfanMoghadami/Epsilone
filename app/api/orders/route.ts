import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  BEAT_LICENSE_COPY,
  BEAT_LICENSE_VERSION,
} from "@/lib/legal/beat-license";
import {
  getLicenseTerms,
  resolveTerms,
} from "@/lib/licenses";


type CartItem = {
  beatId: string;
  licenseId: string;
};

type LicenseRow = {
  id: string;
  beat_id: string;
  license_type: string;
  price: number | string;
  currency: string;
  is_active: boolean;
  includes_stems: boolean;
  terms: string[] | null;
};

type BeatRow = {
  id: string;
  title: string;
  producer_id: string | null;
  stems_key: string | null;
  audio_key: string | null;
  audio_url: string | null;
};

type ProducerRow = {
  id: string;
  display_name: string | null;
  username: string | null;
};

type VerifiedItem = {
  beat_id: string;
  producer_id: string;
  title_snapshot: string;
  producer_name_snapshot: string;
  producer_username_snapshot: string | null;
  unit_price: number;
  license_type: "Basic" | "Premium" | "Exclusive";
  currency: string;
  includes_stems: boolean;
  master_format: string;
  terms: string[];
  uses_custom_terms: boolean;
};

function getMasterFormat(
  audioKey: string | null,
  audioUrl: string | null,
): string {
  const source = audioKey || audioUrl;

  if (!source) {
    return "Not recorded";
  }

  const path = source.split("?")[0];
  const match = path.match(/\.([a-z0-9]+)$/i);

  if (!match) {
    return "Source master format";
  }

  const extension = match[1].toLowerCase();

  if (["mp3", "wav", "flac"].includes(extension)) {
    return extension.toUpperCase();
  }

  return "Source master format";
}

function isLicenseType(
  value: string,
): value is "Basic" | "Premium" | "Exclusive" {
  return (
    value === "Basic" ||
    value === "Premium" ||
    value === "Exclusive"
  );
}

export async function POST(request: Request) {
  let createdOrderId: string | null = null;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to checkout.",
        },
        { status: 401 },
      );
    }

    let body: { items?: CartItem[] };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart is empty.",
        },
        { status: 400 },
      );
    }

    const validItems = items.filter(
      (item): item is CartItem =>
        Boolean(
          item &&
            typeof item.beatId === "string" &&
            item.beatId.trim() &&
            typeof item.licenseId === "string" &&
            item.licenseId.trim(),
        ),
    );

    if (
      validItems.length !== items.length ||
      validItems.length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid cart items.",
        },
        { status: 400 },
      );
    }

    const uniquePairs = new Set(
      validItems.map(
        (item) => `${item.beatId}:${item.licenseId}`,
      ),
    );

    if (uniquePairs.size !== validItems.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate cart items are not allowed.",
        },
        { status: 400 },
      );
    }

    // Only one license per beat can be purchased in one order.
    const uniqueBeatIds = new Set(
      validItems.map((item) => item.beatId),
    );

    if (uniqueBeatIds.size !== validItems.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Select only one license for each Beat in an order.",
        },
        { status: 400 },
      );
    }

    const licenseIds = validItems.map(
      (item) => item.licenseId,
    );

    const beatIds = [...uniqueBeatIds];

    // Load the actual license records. Prices and license types
    // must never be trusted from client-submitted values.
    const { data: rawLicenses, error: licensesError } =
      await supabase
        .from("beat_licenses")
        .select(
          "id, beat_id, license_type, price, currency, is_active, includes_stems, terms",
        )
        .in("id", licenseIds)
        .eq("is_active", true);

    if (licensesError) {
      console.error("Failed to load licenses:", licensesError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not verify the selected licenses.",
        },
        { status: 500 },
      );
    }

    if (
      !rawLicenses ||
      rawLicenses.length !== validItems.length
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "One or more selected licenses are no longer available.",
        },
        { status: 400 },
      );
    }

    const licenses = rawLicenses as LicenseRow[];

    // Load the Beats associated with those licenses.
    const { data: rawBeats, error: beatsError } =
      await supabase
        .from("beats")
        .select(
          "id, title, producer_id, stems_key, audio_key, audio_url",
        )
        .in("id", beatIds);

    if (beatsError) {
      console.error("Failed to load Beats:", beatsError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not verify the selected Beats.",
        },
        { status: 500 },
      );
    }

    if (!rawBeats || rawBeats.length !== beatIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: "One or more Beats no longer exist.",
        },
        { status: 400 },
      );
    }

    const beats = rawBeats as BeatRow[];

    const producerIds = [
      ...new Set(
        beats
          .map((beat) => beat.producer_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const { data: rawProducers, error: producersError } =
      await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", producerIds);

    if (producersError) {
      console.error(
        "Failed to load Producer profiles:",
        producersError,
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not verify the Beat Producers.",
        },
        { status: 500 },
      );
    }

    const producers = (rawProducers ?? []) as ProducerRow[];

    const verifiedItems: VerifiedItem[] = [];

    for (const cartItem of validItems) {
      const license = licenses.find(
        (item) => item.id === cartItem.licenseId,
      );

      const beat = beats.find(
        (item) => item.id === cartItem.beatId,
      );

      if (!license || !beat) {
        return NextResponse.json(
          {
            success: false,
            error: "A selected license does not match its Beat.",
          },
          { status: 400 },
        );
      }

      if (license.beat_id !== beat.id) {
        return NextResponse.json(
          {
            success: false,
            error: "A selected license does not belong to its Beat.",
          },
          { status: 400 },
        );
      }

      if (!beat.producer_id) {
        return NextResponse.json(
          {
            success: false,
            error: `Beat "${beat.title}" has no Producer.`,
          },
          { status: 400 },
        );
      }

      if (!isLicenseType(license.license_type)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This Beat uses an unsupported license type.",
          },
          { status: 400 },
        );
      }

      const price = Number(license.price);

      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid license price.",
          },
          { status: 400 },
        );
      }

      if (
        license.includes_stems &&
        (!beat.stems_key || !beat.stems_key.trim())
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              `The Stem Pack for "${beat.title}" is no longer available.`,
          },
          { status: 400 },
        );
      }

      const producer = producers.find(
        (item) => item.id === beat.producer_id,
      );

      if (!producer) {
        return NextResponse.json(
          {
            success: false,
            error:
              `Could not verify the Producer for "${beat.title}".`,
          },
          { status: 400 },
        );
      }

      const customTerms = Array.isArray(license.terms)
        ? license.terms
        : [];

      const resolvedTerms = resolveTerms(
        license.license_type,
        customTerms,
      );

      verifiedItems.push({
        beat_id: beat.id,
        producer_id: beat.producer_id,
        title_snapshot: beat.title,
        producer_name_snapshot:
          producer.display_name ||
          producer.username ||
          "Producer",
        producer_username_snapshot:
          producer.username || null,
        unit_price: Number(price.toFixed(2)),
        license_type: license.license_type,
        currency: license.currency,
        includes_stems: Boolean(license.includes_stems),
        master_format: getMasterFormat(
          beat.audio_key,
          beat.audio_url,
        ),
        terms: resolvedTerms,
        uses_custom_terms: customTerms.length > 0,
      });
    }

    const currencies = new Set(
      verifiedItems.map((item) => item.currency),
    );

    if (currencies.size !== 1) {
      return NextResponse.json(
        {
          success: false,
          error:
            "All items in one order must use the same currency.",
        },
        { status: 400 },
      );
    }

    const currency = verifiedItems[0].currency;

    const subtotal = Number(
      verifiedItems
        .reduce((sum, item) => sum + item.unit_price, 0)
        .toFixed(2),
    );

    const generatedAt = new Date().toISOString();

    // This frozen snapshot becomes the source for the exact
    // License Sheet the Buyer accepts for this order.
    const licenseDocumentSnapshot = {
      version: BEAT_LICENSE_VERSION,
      documentType: "beat-license",
      generatedAt,
      languageVersions: ["fa", "en"],

      copy: BEAT_LICENSE_COPY,

      buyer: {
        id: user.id,
        email: user.email ?? null,
      },

      order: {
        currency,
        subtotal,
        total: subtotal,
      },

      items: verifiedItems.map((item) => ({
        beatId: item.beat_id,
        beatTitle: item.title_snapshot,

        producerId: item.producer_id,
        producerName: item.producer_name_snapshot,
        producerUsername: item.producer_username_snapshot,

        licenseType: item.license_type,

        exclusivity:
          item.license_type === "Exclusive"
            ? "exclusive"
            : "non-exclusive",

        price: item.unit_price,
        currency: item.currency,

        masterFileFormat: item.master_format,
        includesStems: item.includes_stems,

        terms: item.terms,
        usesCustomProducerTerms: item.uses_custom_terms,
      })),
    };

    // Create the order with its License Sheet snapshot immediately.
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        status: "pending",
        currency,
        subtotal,
        total: subtotal,

        license_document_version: BEAT_LICENSE_VERSION,
        license_document_snapshot: licenseDocumentSnapshot,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Failed to create order:", orderError);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create order.",
        },
        { status: 500 },
      );
    }

    createdOrderId = order.id;

    const orderItems = verifiedItems.map((item) => ({
      order_id: order.id,
      beat_id: item.beat_id,
      producer_id: item.producer_id,
      title_snapshot: item.title_snapshot,
      unit_price: item.unit_price,
      license_type: item.license_type,
      includes_stems: item.includes_stems,

      producer_name_snapshot: item.producer_name_snapshot,
      file_format_snapshot: item.master_format,

      license_terms_snapshot: {
        version: BEAT_LICENSE_VERSION,
        licenseType: item.license_type,
        exclusivity:
          item.license_type === "Exclusive"
            ? "exclusive"
            : "non-exclusive",
        terms: item.terms,
        includesStems: item.includes_stems,
        masterFileFormat: item.master_format,
      },
    }));

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      console.error(
        "Failed to create order items:",
        orderItemsError,
      );

      // Best-effort cleanup: never leave an empty pending order.
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("buyer_id", user.id);

      createdOrderId = null;

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create the order items.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      subtotal,
      total: subtotal,
      currency,
      licenseVersion: BEAT_LICENSE_VERSION,
    });
  } catch (error) {
    console.error(
      "Order creation error:",
      createdOrderId,
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create order.",
      },
      { status: 500 },
    );
  }
}