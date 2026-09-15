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

export async function analyzeBeat(beatId: string, audioUrl: string) {
  await supabase
    .from("beats")
    .update({ analysis_status: "processing" })
    .eq("id", beatId);

  try {
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
