import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ENV } from "../config/env.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = ENV.R2_ACCOUNT_ID;
const R2_PUBLIC_DOMAIN = ENV.R2_PUBLIC_DOMAIN;
const R2_ACCESS_KEY_ID = ENV.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = ENV.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = ENV.R2_BUCKET_NAME;

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadPaymentProofToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });
  await r2Client.send(command);
}

export async function getPresignedProofViewUrl(
  key: string,
  expiresInSeconds: number = 900,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn: expiresInSeconds,
  });
}
