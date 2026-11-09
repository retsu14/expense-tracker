import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import type { MediaStorage } from "@/modules/identity/domain/ports";
import { env } from "@/shared/env";

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
  async put(key, body, contentType) {
    await s3().send(
      new PutObjectCommand({
        Bucket: env().R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "private, max-age=31536000, immutable",
      }),
    );
  },

  async delete(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
  },

  async get(key) {
    try {
      const res = await s3().send(new GetObjectCommand({ Bucket: env().R2_BUCKET, Key: key }));
      if (!res.Body) return null;
      return {
        body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: res.ContentType ?? "application/octet-stream",
        size: res.ContentLength ?? 0,
      };
    } catch {
      return null;
    }
  },

  // served through /api/avatar so the bucket stays private and no CORS is involved
  publicUrl(key) {
    return Promise.resolve(`/api/avatar/${encodeURIComponent(key.split("/").pop() ?? "")}`);
  },
};
