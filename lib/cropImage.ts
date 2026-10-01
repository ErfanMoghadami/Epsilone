function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Crops an image and returns a JPEG File.
 * Pass `outputSize` (e.g. 512) to also downscale to a square of that size
 * (used for avatars). Without it, behaves exactly like before (covers).
 */
export async function getCroppedImg(
  imageSrc: string,
  croppedAreaPixels: Area,
  fileName: string,
  outputSize?: number,
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const outWidth = outputSize ?? croppedAreaPixels.width;
  const outHeight = outputSize ?? croppedAreaPixels.height;

  canvas.width = outWidth;
  canvas.height = outHeight;

  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outWidth,
    outHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas is empty"));
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  });
}