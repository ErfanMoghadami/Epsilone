import { NextResponse } from "next/server";
import { analyzeBeat } from "../../../lib/ai/analyzeBeat";

export async function POST() {
  try {
    const result = await analyzeBeat(
      "565b4049-b754-43a8-b724-c65d2c943425"
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}