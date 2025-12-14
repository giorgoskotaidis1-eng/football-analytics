/**
 * Multipart Upload Utilities
 * 
 * Supports resumable uploads with:
 * - Chunk-based uploads (5-10MB chunks)
 * - Parallel uploads (3-5 parts max)
 * - Retries with exponential backoff
 * - Progress tracking with MB/s and ETA
 */

export interface UploadPart {
  partNumber: number;
  start: number;
  end: number;
  etag?: string;
  uploaded: boolean;
}

export interface UploadProgress {
  uploaded: number; // bytes
  total: number; // bytes
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds
  activeParts: number;
}

export interface MultipartUploadState {
  uploadId: string;
  matchId: number;
  fileName: string;
  fileSize: number;
  chunkSize: number;
  parts: UploadPart[];
  completedParts: number;
  lastUpdated: number;
}

/**
 * Calculate optimal chunk size (5-10MB)
 */
export function calculateChunkSize(fileSize: number): number {
  // 5MB for files < 100MB, 10MB for larger files
  const chunkSize = fileSize < 100 * 1024 * 1024 ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  return Math.min(chunkSize, fileSize);
}

/**
 * Split file into chunks
 */
export function createChunks(fileSize: number, chunkSize: number): UploadPart[] {
  const chunks: UploadPart[] = [];
  let partNumber = 1;
  
  for (let start = 0; start < fileSize; start += chunkSize) {
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({
      partNumber: partNumber++,
      start,
      end,
      uploaded: false,
    });
  }
  
  return chunks;
}

/**
 * Calculate upload speed and ETA
 */
export function calculateProgress(
  uploaded: number,
  total: number,
  startTime: number,
  previousUploaded: number = 0,
  previousTime: number = startTime
): { speed: number; eta: number } {
  const now = Date.now();
  const timeElapsed = (now - previousTime) / 1000; // seconds
  const bytesUploaded = uploaded - previousUploaded;
  
  // Calculate speed (bytes per second)
  const speed = timeElapsed > 0 ? bytesUploaded / timeElapsed : 0;
  
  // Calculate ETA (seconds)
  const remaining = total - uploaded;
  const eta = speed > 0 ? remaining / speed : 0;
  
  return { speed, eta };
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("Retry failed");
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format seconds to human-readable time
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

/**
 * Save upload state to localStorage (for resumable uploads)
 */
export function saveUploadState(state: MultipartUploadState): void {
  if (typeof window !== "undefined") {
    const key = `upload_${state.matchId}_${state.uploadId}`;
    localStorage.setItem(key, JSON.stringify(state));
  }
}

/**
 * Load upload state from localStorage
 */
export function loadUploadState(matchId: number, uploadId: string): MultipartUploadState | null {
  if (typeof window !== "undefined") {
    const key = `upload_${matchId}_${uploadId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  }
  return null;
}

/**
 * Clear upload state from localStorage
 */
export function clearUploadState(matchId: number, uploadId: string): void {
  if (typeof window !== "undefined") {
    const key = `upload_${matchId}_${uploadId}`;
    localStorage.removeItem(key);
  }
}

