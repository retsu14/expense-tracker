import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { MediaStorage } from "@/modules/identity/domain/ports";
import { env } from "@/shared/env";

const UPLOAD_TTL_S = 300;
const READ_TTL_S = 60 * 60;

let client: S3Client | undefined;

function s3() {
  const e = env();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY },
  });
  return client;
}

export const r2Storage: MediaStorage = {
  async createUploadUrl(key, contentType, size) {
    const command = new PutObjectCommand({
      Bucket: env().R2_BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const url = await getSignedUrl(s3(), command, {
      expiresIn: UPLOAD_TTL_S,
      signableHeaders: new Set(["content-type", "content-length"]),
    });
    return { url, headers: { "Content-Type": contentType } };
  },

  async head(key) {
    try {
      const res = await s3().send(new HeadObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
      return { size: res.ContentLength ?? 0, contentType: res.ContentType ?? "" };
    } catch {
      return null;
    }
  },

  async delete(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
  },

  async publicUrl(key) {
    const base = env().R2_PUBLIC_URL;
    if (base) return `${base.replace(/\/$/, "")}/${key}`;
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: env().R2_BUCKET, Key: key }), {
      expiresIn: READ_TTL_S,
    });
  },
};
