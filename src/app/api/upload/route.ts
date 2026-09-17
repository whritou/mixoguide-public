import { v2 as cloudinary } from "cloudinary";
import { NextRequest } from "next/server";
import { withUser } from "@/middlewares/withAuth";
import { ApiResponse } from "@/utils/apiResponse";
import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const POST = withUser(async (req: NextRequest) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return ApiResponse.error("Upload service is not configured", 500, "UPLOAD_NOT_CONFIGURED");
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file || file.size === 0) {
    return ApiResponse.error("No file provided", 400, "BAD_REQUEST");
  }

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
  const MAX_SIZE = 5 * 1024 * 1024

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return ApiResponse.error("Invalid file type", 400, "BAD_REQUEST")
  }
  if (file.size > MAX_SIZE) {
    return ApiResponse.error("File too large (max 5 MB)", 400, "BAD_REQUEST")
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "avatars", resource_type: "image" },
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
