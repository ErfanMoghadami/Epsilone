export async function analyzeBeat(beatId: string) {
  const workerUrl = process.env.VPS_WORKER_URL;
  const workerSecret = process.env.VPS_WORKER_SECRET;

  if (!workerUrl) {
    throw new Error("VPS_WORKER_URL is not configured");
  }

  if (!workerSecret) {
    throw new Error("VPS_WORKER_SECRET is not configured");
  }

  const response = await fetch(
    `${workerUrl}/analyze/${beatId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${workerSecret}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error || "VPS Worker analysis failed"
    );
  }

  return data;
}