// import { NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
// import { applyDiscount, normalizeDiscountPercent } from "@/lib/discounts";

// type RouteContext = {
//   params: Promise<{
//     beatId: string;
//   }>;
// };

// export async function GET(_request: Request, context: RouteContext) {
//   try {
//     const { beatId } = await context.params;

//     const supabase = await createClient();

//     const { data: beat, error: beatError } = await supabase
//       .from("beats")
//       .select("id, discount_percent")
//       .eq("id", beatId)
//       .eq("is_published", true)
//       .maybeSingle();

//     if (beatError) {
//       return NextResponse.json(
//         { success: false, error: beatError.message },
//         { status: 500 },
//       );
//     }

//     if (!beat) {
//       return NextResponse.json(
//         { success: false, error: "This beat is not currently available." },
//         { status: 404 },
//       );
//     }

//     const { data, error } = await supabase
//       .from("beat_licenses")
//       .select("id, license_type, price, currency, includes_stems, terms")
//       .eq("beat_id", beatId)
//       .eq("is_active", true)
//       .order("price", { ascending: true });

//     if (error) {
//       return NextResponse.json(
//         {
//           success: false,
//           error: error.message,
//         },
//         { status: 500 },
//       );
//     }

//     const discountPercent = normalizeDiscountPercent(beat.discount_percent);
//     const licenses = (data ?? []).map((license) => {
//       const originalPrice = Number(license.price);
//       const discountedPrice = applyDiscount(originalPrice, discountPercent);
//       return {
//         ...license,
//         price: originalPrice,
//         original_price: originalPrice,
//         discount_percent: discountPercent,
//         discounted_price: discountedPrice,
//       };
//     });

//     return NextResponse.json({
//       success: true,
//       discountPercent,
//       licenses,
//     });
//   } catch (error) {
//     return NextResponse.json(
//       {
//         success: false,
//         error:
//           error instanceof Error ? error.message : "Failed to load licenses.",
//       },
//       { status: 500 },
//     );
//   }
// }
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyDiscount, normalizeDiscountPercent } from "@/lib/discounts";

type RouteContext = {
  params: Promise<{
    beatId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { beatId } = await context.params;

    const supabase = await createClient();

    const { data: beat, error: beatError } = await supabase
      .from("beats")
      .select("id, discount_percent, exclusive_sold_at")
      .eq("id", beatId)
      .eq("is_published", true)
      .maybeSingle();

    if (beatError) {
      return NextResponse.json(
        { success: false, error: beatError.message },
        { status: 500 },
      );
    }

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "This beat is not currently available." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("beat_licenses")
      .select("id, license_type, price, currency, includes_stems, terms")
      .eq("beat_id", beatId)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    const discountPercent = normalizeDiscountPercent(beat.discount_percent);
    const licenses = (data ?? []).map((license) => {
      const originalPrice = Number(license.price);
      const discountedPrice = applyDiscount(originalPrice, discountPercent);
      return {
        ...license,
        price: originalPrice,
        original_price: originalPrice,
        discount_percent: discountPercent,
        discounted_price: discountedPrice,
      };
    });

    return NextResponse.json({
      success: true,
      discountPercent,
      exclusiveSold: Boolean(beat.exclusive_sold_at),
      licenses,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load licenses.",
      },
      { status: 500 },
    );
  }
}