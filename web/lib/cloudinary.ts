// =============================================================================
// ResolveX — Cloudinary Upload Service
// Provides upload, delete, and URL management for Cloudinary media assets.
// =============================================================================

import { v2 as cloudinary } from "cloudinary";

// ── Configuration ──────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_PATH = process.env.CLOUDINARY_PATH || "/HOME/RESOLVE-X";

// ── Allowed file types and max size ────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf", ".docx"] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// ── Upload a file buffer to Cloudinary ─────────────────────────────────────

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  originalFilename: string;
}

/**
 * Upload a file to Cloudinary under the configured path prefix.
 * The file is stored at: {CLOUDINARY_PATH}/{complaintId}/{uniqueId}_{filename}
 *
 * @param fileBuffer - Raw file data as Buffer
 * @param filename - Original filename for reference
 * @param complaintId - Complaint UUID used as subfolder
 * @returns Upload result with url, publicId, and metadata
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  filename: string,
  complaintId: string,
): Promise<CloudinaryUploadResult> {
  const folder = `${CLOUDINARY_PATH}/${complaintId}`.replace(/\/+/g, "/").replace(/^\/+/, "");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${Date.now()}_${filename.replace(/\.[^.]+$/, "")}`,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload returned empty result"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          originalFilename: filename,
        });
      },
    );

    uploadStream.end(fileBuffer);
  });
}

// ── Delete an asset from Cloudinary ────────────────────────────────────────

/**
 * Delete a file from Cloudinary by its public ID.
 *
 * @param publicId - The public ID of the asset to delete
 * @returns true if deletion was successful
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (error) {
    throw new Error(
      `Cloudinary delete failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ── Validate file ──────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file's MIME type and size against allowed constraints.
 */
export function validateFile(
  file: File,
): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    const allowed = ALLOWED_MIME_TYPES.map((t) => t.split("/")[1]).join(", ");
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Allowed: ${allowed}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 10 MB`,
    };
  }

  return { valid: true };
}
