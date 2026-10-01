import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    return NextResponse.json({
      success: false,
      step: "env",
      error: "NEXT_PUBLIC_SUPABASE_URL is missing",
    });
  }

  if (!serviceRoleKey) {
    return NextResponse.json({
      success: false,
      step: "env",
      error: "SUPABASE_SERVICE_ROLE_KEY is missing",
    });
  }

  const url = `${supabaseUrl}/rest/v1/beats?select=id&limit=1`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    const body = await response.text();

    return NextResponse.json({
      success: response.ok,
      step: "supabase-request",
      status: response.status,
      statusText: response.statusText,
      body,
    });
  } catch (error) {
    const e = error as Error & {
      cause?: {
        name?: string;
        message?: string;
        code?: string;
        errno?: number;
        syscall?: string;
        address?: string;
        port?: number;
      };
    };

    return NextResponse.json({
      success: false,
      step: "fetch",
      error: {
        name: e.name,
        message: e.message,
        cause: e.cause
          ? {
              name: e.cause.name,
              message: e.cause.message,
              code: e.cause.code,
              errno: e.cause.errno,
              syscall: e.cause.syscall,
              address: e.cause.address,
              port: e.cause.port,
            }
          : null,
      },
    });
  }
}