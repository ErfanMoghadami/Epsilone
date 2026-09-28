import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const endpoint =
  process.env.R2_ENDPOINT ||
  (accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : undefined);

const bucketName =
  process.env.R2_BUCKET_NAME ||
  process.env.R2_BUCKET ||
  "epsilone-media";

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error("R2 server environment variables are not configured.");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function createR2PresignedPutUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2Client, command, {
    expiresIn: 60 * 30,
  });
}

export async function headR2Object(key: string) {
  const command = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return r2Client.send(command);
}

export async function deleteR2Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
}

export async function deleteR2Objects(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await deleteR2Object(key);
      } catch (error) {
        console.error(`Failed to delete R2 object: ${key}`, error);
      }
    }),
  );
}