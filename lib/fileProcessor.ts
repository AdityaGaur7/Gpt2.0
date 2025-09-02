import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

export interface FileData {
  name: string;
  data: Buffer;
  mediaType: string;
  size: number;
}

export interface ProcessedFile {
  type: "file";
  data: Buffer;
  mediaType: string;
}

export interface ProcessedTextFile {
  type: "text";
  text: string;
}

// Supported file types and their MIME types
export const SUPPORTED_FILE_TYPES = {
  // Images
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],

  // Documents
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],

  // Spreadsheets
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],

  // Presentations
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
} as const;

export function getMediaTypeFromFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();

  for (const [mediaType, extensions] of Object.entries(SUPPORTED_FILE_TYPES)) {
    if (extensions.includes(ext as never)) {
      return mediaType;
    }
  }

  return "application/octet-stream"; // Default fallback
}

export function isFileTypeSupported(fileName: string): boolean {
  const mediaType = getMediaTypeFromFileName(fileName);
  return mediaType !== "application/octet-stream";
}

export async function processFileFromUrl(
  fileUrl: string,
  fileName: string
): Promise<FileData> {
  try {
    // Fetch file from URL
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const mediaType = getMediaTypeFromFileName(fileName);

    return {
      name: fileName,
      data,
      mediaType,
      size: data.length,
    };
  } catch (error) {
    console.error("Error processing file from URL:", error);
    throw new Error(
      `Failed to process file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function processFileFromUrlAsText(
  fileUrl: string,
  fileName: string
): Promise<ProcessedTextFile | ProcessedFile> {
  try {
    console.log(`Fetching file from URL: ${fileUrl}`);
    
    // Fetch file from URL with proper headers
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = Buffer.from(arrayBuffer);
    const mediaType = getMediaTypeFromFileName(fileName);
    
    console.log(`File size: ${data.length} bytes, Media type: ${mediaType}`);

    // Extract text from PDFs
    if (mediaType === "application/pdf") {
      try {
        console.log("Attempting to parse PDF...");
        const pdfData = await pdf(data);
        console.log(`PDF parsed successfully, text length: ${pdfData.text.length}`);
        return {
          type: "text",
          text: pdfData.text,
        };
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        // Fallback to file if PDF parsing fails
        return {
          type: "file",
          data,
          mediaType,
        };
      }
    }

    // For non-PDF files, return as file
    return {
      type: "file",
      data,
      mediaType,
    };
  } catch (error) {
    console.error("Error processing file from URL:", error);
    throw new Error(
      `Failed to process file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function processFileFromPath(filePath: string): Promise<FileData> {
  try {
    const fileName = path.basename(filePath);
    const data = fs.readFileSync(filePath);
    const mediaType = getMediaTypeFromFileName(fileName);

    return {
      name: fileName,
      data,
      mediaType,
      size: data.length,
    };
  } catch (error) {
    console.error("Error processing file from path:", error);
    throw new Error(
      `Failed to process file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function createFileContent(fileData: FileData): ProcessedFile {
  return {
    type: "file",
    data: fileData.data,
    mediaType: fileData.mediaType,
  };
}

export function createTextContent(text: string) {
  return {
    type: "text" as const,
    text,
  };
}

// Validate file size (max 20MB for Gemini)
export function validateFileSize(
  fileData: FileData,
  maxSizeMB: number = 20
): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileData.size <= maxSizeBytes;
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
