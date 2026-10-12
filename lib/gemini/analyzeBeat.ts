import "server-only";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { analysisText, analysisResponseSchema } from "./prompt";
import { validateAnalysis } from "./validate";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);


function mergeUniqueMetadata(primary: unknown, secondary: unknown, max: number): string[] {
  const values = [primary, secondary].flatMap((source) =>
    Array.isArray(source)
      ? source.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim())
      : [],
  );

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
    if (merged.length >= max) break;
  }
  return merged;
}

export async function analyzeBeat(beatId: string, audioUrl: string) {
  let producerMetadata: {
    moods?: unknown;
    atmosphere?: unknown;
    instruments?: unknown;
    scenes?: unknown;
    semantic_tags?: unknown;
  } = {};

  try {
    const { data: existingBeat, error: metadataError } = await supabase
      .from("beats")
      .select("moods, atmosphere, instruments, scenes, semantic_tags")
      .eq("id", beatId)
      .maybeSingle();

    if (metadataError) throw metadataError;
    producerMetadata = existingBeat ?? {};

    await supabase
      .from("beats")
      .update({ analysis_status: "processing" })
      .eq("id", beatId);

    const audioRes = await fetch(audioUrl);
    const mimeType = audioRes.headers.get("content-type") ?? "audio/mpeg";
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    const uploadedFile = await ai.files.upload({
      file: new Blob([audioBuffer]),
      config: { mimeType },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType) {
      throw new Error("Gemini file upload did not return a uri/mimeType");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
        analysisText,
      ]),
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response");
    }

    const raw: unknown = JSON.parse(response.text);
    const clean = validateAnalysis(raw);

    await supabase
      .from("beats")
      .update({
        ...clean,
        // Producer-selected metadata has priority; AI enriches empty slots.
        moods: mergeUniqueMetadata(producerMetadata.moods, clean.moods, 5),
        atmosphere: mergeUniqueMetadata(producerMetadata.atmosphere, clean.atmosphere, 4),
        instruments: mergeUniqueMetadata(producerMetadata.instruments, clean.instruments, 8),
        scenes: mergeUniqueMetadata(producerMetadata.scenes, clean.scenes, 3),
        semantic_tags: mergeUniqueMetadata(producerMetadata.semantic_tags, clean.semantic_tags, 10),
        analysis_status: "completed",
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", beatId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await supabase
      .from("beats")
      .update({
        analysis_status: "failed",
        analysis_error: message,
      })
      .eq("id", beatId);
    throw err;
  }
}
