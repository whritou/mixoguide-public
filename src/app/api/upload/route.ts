import { v2 as cloudinary } from "cloudinary";
import { NextRequest } from "next/server";
import { withUser } from "@/middlewares/withAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { env } from "@/lib/env";
import { detectImageFormat } from "@/utils/imageFormat";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const MAX_SIZE = 5 * 1024 * 1024
/** Multipart overhead allowance on top of the file itself. */
const MAX_BODY_SIZE = MAX_SIZE + 64 * 1024

export const POST = withUser(async (req: NextRequest) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return ApiResponse.error("Upload service is not configured", 500, "UPLOAD_NOT_CONFIGURED");
  }

  // Reject oversized bodies before buffering the multipart payload (SEC-012/BPERF-003).
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_SIZE) {
    return ApiResponse.error("File too large (max 5 MB)", 413, "PAYLOAD_TOO_LARGE");
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return ApiResponse.error("No file provided", 400, "BAD_REQUEST");
  }
  if (file.size > MAX_SIZE) {
    return ApiResponse.error("File too large (max 5 MB)", 400, "BAD_REQUEST")
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Trust the bytes, not the client-declared MIME type (SEC-014).
  const format = detectImageFormat(buffer);
  if (!format) {
    return ApiResponse.error("Invalid file type", 400, "BAD_REQUEST")
  }

  const uploaded = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "avatars", resource_type: "image", allowed_formats: ["jpg", "png", "webp", "gif"] },
          (err, result) => {
            if (err || !result) reject(err);
            else resolve(result as { secure_url: string });
          },
        )
        .end(buffer);
    },
  );

  return ApiResponse.success({ url: uploaded.secure_url });
}, { rateLimit: "upload" });
