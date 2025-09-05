import {
  ComputableProgressInfo,
  UnknownProgressInfo,
  ProgressCallback,
  uploadFile,
} from "@uploadcare/upload-client";

export interface UploadcareConfig {
  publicKey: string;
  secretKey?: string;
}

export interface UploadResult {
  uuid: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  cdnUrl: string;
}

export class UploadcareService {
  private config: UploadcareConfig;

  constructor(config: UploadcareConfig) {
    this.config = config;
  }

  async uploadFile(
    file: File | Blob,
    options?: {
      fileName?: string;
      onProgress?: (progress: number) => void;
    }
  ): Promise<UploadResult> {
    try {
      const result = await uploadFile(file, {
        publicKey: this.config.publicKey,
        fileName: options?.fileName,
        onProgress: options?.onProgress as unknown as ProgressCallback<
          ComputableProgressInfo | UnknownProgressInfo
        >,
      });

      return {
        uuid: result.uuid,
        name: result.name || options?.fileName || "unknown",
        size: result.size,
        mimeType: result.mimeType || "application/octet-stream",
        url: result.cdnUrl,
        cdnUrl: result.cdnUrl,
      };
    } catch (error) {
      console.error("Uploadcare upload error:", error);
      throw new Error(
        `Upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async uploadFromUrl(
    url: string,
    options?: {
      fileName?: string;
    }
  ): Promise<UploadResult> {
    try {
      // Fetch the file from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const fileName = options?.fileName || url.split("/").pop() || "file";

      return this.uploadFile(blob, { fileName });
    } catch (error) {
      console.error("Uploadcare URL upload error:", error);
      throw new Error(
        `URL upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  getFileUrl(
    uuid: string,
    transformations?: {
      resize?: { width?: number; height?: number };
      crop?: { width: number; height: number; x?: number; y?: number };
      quality?: number;
    }
  ): string {
    let url = `https://ucarecdn.com/${uuid}/`;

    if (transformations) {
      const params: string[] = [];

      if (transformations.resize) {
        const { width, height } = transformations.resize;
        if (width && height) {
          params.push(`-/resize/${width}x${height}/`);
        } else if (width) {
          params.push(`-/resize/${width}x/`);
        } else if (height) {
          params.push(`-/resize/x${height}/`);
        }
      }

      if (transformations.crop) {
        const { width, height, x = 0, y = 0 } = transformations.crop;
        params.push(`-/crop/${width}x${height}/${x},${y}/`);
      }

      if (transformations.quality) {
        params.push(`-/quality/${transformations.quality}/`);
      }

      if (params.length > 0) {
        url += params.join("");
      }
    }

    return url;
  }

  async deleteFile(uuid: string): Promise<boolean> {
    try {
      if (!this.config.secretKey) {
        throw new Error("Secret key required for file deletion");
      }

      const response = await fetch(
        `https://api.uploadcare.com/files/${uuid}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Uploadcare.Simple ${this.config.publicKey}:${this.config.secretKey}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error("Uploadcare delete error:", error);
      return false;
    }
  }
}

// Create singleton instance
export const uploadcareService = new UploadcareService({
  publicKey: process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY || "",
  secretKey: process.env.UPLOADCARE_SECRET_KEY,
});
