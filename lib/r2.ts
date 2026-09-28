import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const endpoint = process.env.R2_ENDPOINT;

if (
  !accountId ||
  !accessKeyId ||
  !secretAccessKey ||
  !bucketName ||
  !endpoint
) {
  throw new Error("R2 environment variables are not fully configured.");
}

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
export async function getR2UploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
) {
  return await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }),
    {
      expiresIn,
    },
  );
}
export async function getR2Object(key: string) {
  return await r2.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}

export async function getR2SignedUrl(
  key: string,
  expiresIn = 600,
  filename?: string,
) {
  return await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      ResponseContentDisposition: filename
        ? `attachment; filename="${filename}"`
        : undefined,
      ResponseContentType: filename ? "audio/mpeg" : undefined,
    }),
    {
      expiresIn,
    },
  );
}

export async function deleteFromR2(key: string) {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
}
