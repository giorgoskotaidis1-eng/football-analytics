"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  calculateChunkSize,
  createChunks,
  calculateProgress,
  retryWithBackoff,
  formatBytes,
  formatTime,
  saveUploadState,
  loadUploadState,
  clearUploadState,
  type MultipartUploadState,
  type UploadProgress,
} from "@/lib/multipart-upload";

interface VideoUploadProps {
  matchId: number;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  onAnalysisComplete?: () => void;
}

const MAX_PARALLEL_PARTS = 5;
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB default

export function VideoUpload({ matchId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, onAnalysisComplete }: VideoUploadProps) {
  const { t } = useTranslation();
  
  // Load persisted settings from localStorage
  const storageKey = `videoUpload_${matchId}`;
  const loadPersistedSettings = () => {
    if (typeof window === "undefined") {
      return {
        useUrl: false,
        enableTranscode: true,
        leftSideTeam: null as "home" | "away" | null,
      };
    }
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
        useUrl: parsed.useUrl === true,
        enableTranscode: parsed.enableTranscode !== undefined ? parsed.enableTranscode : true,
        leftSideTeam: (parsed.leftSideTeam === "home" || parsed.leftSideTeam === "away") ? parsed.leftSideTeam : null,
        customStoragePath: parsed.customStoragePath || "",
        useCustomPath: parsed.useCustomPath === true,
        };
      }
    } catch (e) {
      console.warn("[VideoUpload] Failed to load persisted settings:", e);
    }
    
    return {
      useUrl: false,
      enableTranscode: true,
      leftSideTeam: null as "home" | "away" | null,
    };
  };

  const persistedSettings = loadPersistedSettings();
  
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    uploaded: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    eta: 0,
    activeParts: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [useUrl, setUseUrl] = useState(persistedSettings.useUrl);
  const [enableTranscode, setEnableTranscode] = useState(persistedSettings.enableTranscode);
  const [transcoding, setTranscoding] = useState(false);
  const [transcodeProgress, setTranscodeProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadStateRef = useRef<MultipartUploadState | null>(null);
  const startTimeRef = useRef<number>(0);
  const previousProgressRef = useRef<{ uploaded: number; time: number }>({ uploaded: 0, time: 0 });
  const [leftSideTeam, setLeftSideTeam] = useState<"home" | "away" | null>(persistedSettings.leftSideTeam);
  const [customStoragePath, setCustomStoragePath] = useState<string>(persistedSettings.customStoragePath || "");
  const [useCustomPath, setUseCustomPath] = useState<boolean>(persistedSettings.useCustomPath || false);
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const settingsToSave = {
        useUrl,
        enableTranscode,
        leftSideTeam,
        customStoragePath,
        useCustomPath,
      };
      localStorage.setItem(storageKey, JSON.stringify(settingsToSave));
    } catch (e) {
      console.warn("[VideoUpload] Failed to save settings:", e);
    }
  }, [useUrl, enableTranscode, leftSideTeam, storageKey]);

  // Check for resumable upload on mount
  useEffect(() => {
    // Try to resume if there's a stored upload state
    const checkResume = async () => {
      // This would check localStorage for incomplete uploads
      // Implementation depends on your needs
    };
    checkResume();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // VALIDATION: Team side selection is mandatory
    if (leftSideTeam === null) {
      setError(t("pleaseSelectTeamSide") || "Παρακαλώ επιλέξτε ποια ομάδα είναι στο αριστερό μέρος του video");
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      if (useUrl && videoUrl) {
        // URL upload (no multipart needed)
        await handleUrlUpload(videoUrl, signal);
      } else {
        // File upload (multipart)
        const fileInput = document.getElementById("video-file") as HTMLInputElement;
        if (!fileInput?.files?.[0]) {
          setError(t("pleaseSelectVideoFile"));
          return;
        }

        const file = fileInput.files[0];
        await handleFileUpload(file, signal);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError(t("uploadCancelled"));
      } else {
        setError(err.message || t("uploadFailed"));
      }
      setUploading(false);
      setAnalyzing(false);
    } finally {
      abortControllerRef.current = null;
    }
  }

  async function handleUrlUpload(url: string, signal: AbortSignal) {
    setUploading(true);
    setAnalyzing(false);
    setProgress({ uploaded: 0, total: 0, percentage: 0, speed: 0, eta: 0, activeParts: 0 });

    // For URL uploads, we can skip multipart and go directly to analysis
    // Calculate team IDs and attack direction
    const teamLeftId = leftSideTeam === "home" ? homeTeamId : awayTeamId;
    const teamRightId = leftSideTeam === "home" ? awayTeamId : homeTeamId;
    const attackDirection = "left-to-right"; // Left side attacks towards right (y=0 -> y=100)

    const response = await fetch(`/api/matches/${matchId}/video/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: url,
        provider: "opencv",
        leftSideTeam,
        teamLeftId,
        teamRightId,
        attackDirection,
        normalize: true,
      }),
      signal,
    });

    if (signal.aborted) {
      setError(t("uploadCancelled"));
      setUploading(false);
      return;
    }

    const result = await response.json().catch(() => ({ ok: false, message: t("failedToParseResponse") }));

    if (response.ok && result.ok) {
      setProgress({ uploaded: 100, total: 100, percentage: 100, speed: 0, eta: 0, activeParts: 0 });
      setUploading(false);
      setAnalyzing(true);
      await handleAnalysisComplete(result);
    } else {
      setError(result.message || t("analysisFailed"));
      setUploading(false);
    }
  }

  async function handleFileUpload(file: File, signal: AbortSignal) {
    // Validate video format before upload
    const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    const validExtensions = [".mp4", ".webm", ".mov", ".avi"];
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError(`Unsupported video format: ${file.type || fileExtension}. Please use MP4 (H.264), WebM, or MOV. For best compatibility, convert to MP4 with H.264 codec.`);
      setUploading(false);
      return;
    }
    
    // Warn if not MP4 (best compatibility)
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      console.warn(`[VideoUpload] Video format ${file.type || fileExtension} may not be fully supported. MP4 (H.264) is recommended.`);
      // Show warning but allow upload
      setError(`Warning: ${fileExtension} format may not be fully supported in all browsers. MP4 (H.264) is recommended for best compatibility.`);
      setTimeout(() => setError(null), 5000); // Clear warning after 5 seconds
    }
    setUploading(true);
    setAnalyzing(false);
    startTimeRef.current = Date.now();
    previousProgressRef.current = { uploaded: 0, time: startTimeRef.current };

    // Check file size (max 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File size exceeds 2GB limit");
      setUploading(false);
      return;
    }

    // Check for existing upload state (resumable)
    // For now, we'll always start fresh. Resume can be added later with proper state management
    let uploadState: MultipartUploadState;

    // Initialize new multipart upload
    const chunkSize = calculateChunkSize(file.size);
    const chunks = createChunks(file.size, chunkSize);

    const initResponse = await fetch(`/api/matches/${matchId}/video/upload-init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        chunkSize,
      }),
      signal,
    });

    if (signal.aborted) {
      setError(t("uploadCancelled"));
      setUploading(false);
      return;
    }

    const initResult = await initResponse.json();
    if (!initResult.ok) {
      setError(initResult.message || "Failed to initialize upload");
      setUploading(false);
      return;
    }

    uploadState = {
      uploadId: initResult.uploadId,
      matchId,
      fileName: file.name,
      fileSize: file.size,
      chunkSize: initResult.chunkSize,
      parts: chunks.map((chunk, idx) => ({
        ...chunk,
        uploaded: false,
      })),
      completedParts: 0,
      lastUpdated: Date.now(),
    };

    // Check for already uploaded parts (resume)
    const statusResponse = await fetch(
      `/api/matches/${matchId}/video/upload-status?uploadId=${uploadState.uploadId}`,
      { signal }
    );
    if (statusResponse.ok) {
      const statusResult = await statusResponse.json();
      if (statusResult.uploadedParts) {
        statusResult.uploadedParts.forEach((partNum: number) => {
          const part = uploadState.parts.find((p) => p.partNumber === partNum);
          if (part) {
            part.uploaded = true;
            uploadState.completedParts++;
          }
        });
      }
    }

    uploadStateRef.current = uploadState;
    saveUploadState(uploadState);

    // Upload parts in parallel (max 5 at a time)
    const partsToUpload = uploadState.parts.filter((p) => !p.uploaded);
    const totalParts = uploadState.parts.length;

    setProgress({
      uploaded: uploadState.completedParts * uploadState.chunkSize,
      total: file.size,
      percentage: (uploadState.completedParts / totalParts) * 100,
      speed: 0,
      eta: 0,
      activeParts: 0,
    });

    // Upload parts with parallel limit
    const uploadPromises: Promise<void>[] = [];
    let currentIndex = 0;

    const uploadNextPart = async (): Promise<void> => {
      while (currentIndex < partsToUpload.length && !signal.aborted) {
        const part = partsToUpload[currentIndex++];
        const partIndex = part.partNumber - 1;

        // Update active parts count
        setProgress((prev) => ({ ...prev, activeParts: currentIndex - uploadState.completedParts }));

        try {
          // Read part from file
          const partBlob = file.slice(part.start, part.end);
          const partFormData = new FormData();
          partFormData.append("part", partBlob);

          // Upload part with retry
          const etag = await retryWithBackoff(async () => {
            const uploadUrl = useCustomPath && customStoragePath
              ? `/api/matches/${matchId}/video/upload-part?uploadId=${uploadState.uploadId}&partNumber=${part.partNumber}&customStoragePath=${encodeURIComponent(customStoragePath)}`
              : `/api/matches/${matchId}/video/upload-part?uploadId=${uploadState.uploadId}&partNumber=${part.partNumber}`;
            const partResponse = await fetch(uploadUrl, {
              method: "POST",
              body: partFormData,
              signal,
            });

            if (!partResponse.ok) {
              const errorData = await partResponse.json().catch(() => ({}));
              throw new Error(errorData.message || "Failed to upload part");
            }

            const partResult = await partResponse.json();
            return partResult.etag;
          }, 3, 1000);

          // Mark part as uploaded
          part.uploaded = true;
          part.etag = etag;
          uploadState.completedParts++;

          // Update progress
          const now = Date.now();
          const { speed, eta } = calculateProgress(
            uploadState.completedParts * uploadState.chunkSize,
            file.size,
            startTimeRef.current,
            previousProgressRef.current.uploaded,
            previousProgressRef.current.time
          );

          previousProgressRef.current = {
            uploaded: uploadState.completedParts * uploadState.chunkSize,
            time: now,
          };

          setProgress({
            uploaded: uploadState.completedParts * uploadState.chunkSize,
            total: file.size,
            percentage: (uploadState.completedParts / totalParts) * 100,
            speed,
            eta,
            activeParts: Math.max(0, currentIndex - uploadState.completedParts),
          });

          // Save state for resume
          saveUploadState(uploadState);
          uploadStateRef.current = uploadState;

          // Upload next part
          await uploadNextPart();
        } catch (err: any) {
          if (err.name === "AbortError") {
            throw err;
          }
          console.error(`[VideoUpload] Part ${part.partNumber} upload failed:`, err);
          // Retry will be handled by retryWithBackoff, but if it still fails, we continue
          // The part will remain unuploaded and can be resumed later
        }
      }
    };

    // Start parallel uploads
    for (let i = 0; i < Math.min(MAX_PARALLEL_PARTS, partsToUpload.length); i++) {
      uploadPromises.push(uploadNextPart());
    }

    try {
      await Promise.all(uploadPromises);

      if (signal.aborted) {
        setError(t("uploadCancelled"));
        setUploading(false);
        return;
      }

      // All parts uploaded, complete multipart upload
      const completeResponse = await fetch(`/api/matches/${matchId}/video/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: uploadState.uploadId,
          fileName: file.name,
          parts: uploadState.parts.map((p) => ({
            partNumber: p.partNumber,
            etag: p.etag,
          })),
          customStoragePath: useCustomPath && customStoragePath ? customStoragePath : undefined,
        }),
        signal,
      });

      if (signal.aborted) {
        setError(t("uploadCancelled"));
        setUploading(false);
        return;
      }

      const completeResult = await completeResponse.json();
      if (!completeResult.ok) {
        setError(completeResult.message || "Failed to complete upload");
        setUploading(false);
        return;
      }

      // Clear upload state
      clearUploadState(matchId, uploadState.uploadId);
      uploadStateRef.current = null;

      // Update progress to 100%
      setProgress({
        uploaded: file.size,
        total: file.size,
        percentage: 100,
        speed: 0,
        eta: 0,
        activeParts: 0,
      });

      // Start analysis
      setUploading(false);
      setAnalyzing(true);

      // Check if transcoding is needed and enabled
      // Transcode if: 1) Not MP4, OR 2) MP4 but may have unsupported codec (H.265, etc.)
      // Always transcode to ensure H.264 codec for best browser compatibility
      let finalVideoPath = completeResult.videoPath;
      
      if (enableTranscode) {
        // Always transcode to ensure H.264 codec (even if already MP4, it might be H.265)
        setTranscoding(true);
        setTranscodeProgress(0);
        
        try {
          const transcodeResponse = await fetch(`/api/matches/${matchId}/video/transcode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoPath: completeResult.videoPath }),
            signal,
          });
          
          if (signal.aborted) {
            setError(t("uploadCancelled"));
            setTranscoding(false);
            return;
          }
          
          const transcodeResult = await transcodeResponse.json();
          
          if (transcodeResponse.ok && transcodeResult.ok) {
            finalVideoPath = transcodeResult.videoPath;
            console.log("[VideoUpload] Video transcoded successfully:", finalVideoPath);
          } else {
            console.warn("[VideoUpload] Transcoding failed or not available:", transcodeResult.message);
            // Continue with original video - transcoding is optional
          }
        } catch (transcodeError: any) {
          console.warn("[VideoUpload] Transcoding error:", transcodeError);
          // Continue with original video - transcoding is optional
        } finally {
          setTranscoding(false);
          setTranscodeProgress(0);
        }
      }

      // Trigger analysis with final video path
      // Calculate team IDs and attack direction
      const teamLeftId = leftSideTeam === "home" ? homeTeamId : awayTeamId;
      const teamRightId = leftSideTeam === "home" ? awayTeamId : homeTeamId;
      const attackDirection = "left-to-right"; // Left side attacks towards right (y=0 -> y=100)

      const analyzeResponse = await fetch(`/api/matches/${matchId}/video/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: finalVideoPath.startsWith("http") ? finalVideoPath : undefined,
          videoPath: finalVideoPath.startsWith("http") ? undefined : finalVideoPath,
          provider: "opencv",
          leftSideTeam,
          teamLeftId,
          teamRightId,
          attackDirection,
          normalize: true,
        }),
        signal,
      });

      if (signal.aborted) {
        setError(t("uploadCancelled"));
        setAnalyzing(false);
        return;
      }

      const analyzeResult = await analyzeResponse.json();
      await handleAnalysisComplete(analyzeResult);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError(t("uploadCancelled"));
      } else {
        setError(err.message || t("uploadFailed"));
      }
      setUploading(false);
      setAnalyzing(false);
    }
  }

  async function handleAnalysisComplete(result: any) {
    setAnalyzing(false);

    if (onAnalysisComplete) {
      setTimeout(() => {
        onAnalysisComplete();
      }, 0);
    }

    const eventsCount = result.analysis?.eventsDetected || 0;
    setTimeout(() => {
      if (eventsCount > 0) {
        alert(t("analysisComplete").replace("{count}", eventsCount.toString()));
      } else {
        alert(result.message || t("videoUploadedSuccessfully"));
      }
    }, 100);
  }

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setUploading(false);
    setAnalyzing(false);
    setProgress({ uploaded: 0, total: 0, percentage: 0, speed: 0, eta: 0, activeParts: 0 });
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-[#1a1f2e] bg-[#0b1220] p-4 text-[11px] shadow-lg">
      <div className="flex items-center justify-between">
        <p className="font-medium text-white">{t("videoAnalysis")}</p>
        <button
          type="button"
          onClick={() => setUseUrl(!useUrl)}
          className="text-[10px] text-white/60 hover:text-white"
        >
          {useUrl ? t("uploadFile") : t("useUrl")}
        </button>
      </div>

      <p className="text-[10px] text-white/50">
        {t("videoUploadDescription")}
      </p>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-[10px] text-red-300">
          {error}
        </div>
      )}

      {useUrl ? (
        <div className="space-y-1.5">
          <label className="text-white/70">{t("videoUrl")}</label>
          <input
            type="url"
            className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder={t("videoUrlPlaceholder")}
            required
          />
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-white/70">{t("videoFile")}</label>
            <input
              id="video-file"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setError(null);
                  
                  // Validate video format
                  const validTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
                  const validExtensions = [".mp4", ".webm", ".mov", ".avi"];
                  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
                  
                  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
                    setError("Unsupported video format. Please use MP4 (H.264), WebM, or MOV. For best compatibility, convert to MP4 with H.264 codec.");
                    e.target.value = ""; // Clear input
                    return;
                  }
                  
                  // Try to validate video codec by creating a video element and checking if it can play
                  // This helps detect if MP4 files use unsupported codecs (e.g., H.265)
                  if (file.type === "video/mp4" || fileExtension === ".mp4") {
                    try {
                      const video = document.createElement("video");
                      video.preload = "metadata";
                      const objectUrl = URL.createObjectURL(file);
                      video.src = objectUrl;
                      
                      await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                          URL.revokeObjectURL(objectUrl);
                          reject(new Error("Video validation timeout - file may be too large or corrupted"));
                        }, 10000); // 10 second timeout
                        
                        video.onloadedmetadata = () => {
                          clearTimeout(timeout);
                          URL.revokeObjectURL(objectUrl);
                          resolve(true);
                        };
                        
                        video.onerror = (err) => {
                          clearTimeout(timeout);
                          URL.revokeObjectURL(objectUrl);
                          const error = video.error;
                          if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || error?.code === MediaError.MEDIA_ERR_DECODE) {
                            reject(new Error("Video codec not supported by browser. This MP4 file may use H.265/HEVC or another unsupported codec. Please convert to MP4 with H.264 codec."));
                          } else {
                            reject(new Error("Video validation failed. Please ensure the file is a valid MP4 with H.264 codec."));
                          }
                        };
                      });
                      
                      // Validation passed
                      console.log("Video format validated successfully");
                    } catch (err: any) {
                      console.warn("Video validation error:", err);
                      setError(err.message || "Video may not be compatible. Please convert to MP4 with H.264 codec for best results.");
                      // Don't clear input - let user proceed if they want, but show warning
                    }
                  } else {
                    // Warn if not MP4
                    console.warn("Video format may not be fully supported. MP4 (H.264) is recommended for best browser compatibility.");
                    setError("Warning: This format may not be fully supported in all browsers. MP4 (H.264) is recommended. You can proceed, but the video may not play.");
                    setTimeout(() => setError(null), 5000); // Clear warning after 5 seconds
                  }
                }
              }}
              className="h-8 w-full rounded-md border border-[#1a1f2e] bg-[#0b1220] px-2 text-[11px] text-white outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 file:mr-4 file:rounded file:border-0 file:bg-emerald-500 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-[#0b1220]"
              required={!useUrl}
            />
            <p className="text-[9px] text-white/50">{t("supportedFormats")}</p>
          </div>

          {/* Optional transcode option */}
          <div className="flex items-center gap-2 rounded-lg border border-[#1a1f2e] bg-[#0b1220] p-2">
            <input
              type="checkbox"
              id="transcode-option"
              checked={enableTranscode}
              onChange={(e) => setEnableTranscode(e.target.checked)}
              className="h-3 w-3 rounded border-[#1a1f2e] bg-[#0b1220] text-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            />
            <label htmlFor="transcode-option" className="text-[10px] text-white/70 cursor-pointer">
              Auto-convert to MP4 (H.264) for best compatibility
            </label>
          </div>
          {transcoding && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                <span className="text-xs text-emerald-400 font-semibold">Converting video to MP4 (H.264)...</span>
              </div>
              {transcodeProgress > 0 && (
                <div className="w-full bg-black/30 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${transcodeProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Team Side Selection - MANDATORY */}
      <div className={`space-y-1.5 rounded-lg border p-2 ${
        leftSideTeam === null 
          ? "border-red-500/50 bg-red-500/5" 
          : "border-[#1a1f2e] bg-[#0b1220]"
      }`}>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-white/80">
            Ποια ομάδα είναι στο αριστερό μέρος του video? <span className="text-red-400">*</span>
          </label>
          {leftSideTeam !== null && (
            <div className="text-[9px] text-emerald-400 font-medium">
              ✓ Επιλεγμένο
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLeftSideTeam("home")}
            className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition ${
              leftSideTeam === "home"
                ? "bg-emerald-500 text-[#0b1220] ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0b1220]"
                : "bg-[#1a1f2e] text-white/80 hover:bg-[#1f2535]"
            }`}
          >
            {homeTeamName || "Home"} (Αριστερά)
          </button>
          <button
            type="button"
            onClick={() => setLeftSideTeam("away")}
            className={`flex-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition ${
              leftSideTeam === "away"
                ? "bg-emerald-500 text-[#0b1220] ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0b1220]"
                : "bg-[#1a1f2e] text-white/80 hover:bg-[#1f2535]"
            }`}
          >
            {awayTeamName || "Away"} (Αριστερά)
          </button>
        </div>
        {leftSideTeam === null ? (
          <p className="text-[9px] text-red-400 font-medium">
            ⚠ Παρακαλώ επιλέξτε ποια ομάδα είναι στο αριστερό μέρος πριν το upload
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-[9px] text-white/70">
              Επιλέχθηκε: <span className="font-semibold text-white">
                {leftSideTeam === "home" ? (homeTeamName || "Home") : (awayTeamName || "Away")}
              </span> στο αριστερό μέρος (επιτίθεται από y=0 προς y=100)
            </p>
            <p className="text-[9px] text-white/50">
              Δεξιά: <span className="text-white/70">
                {leftSideTeam === "home" ? (awayTeamName || "Away") : (homeTeamName || "Home")}
              </span>
            </p>
          </div>
        )}
      </div>

      {(uploading || analyzing) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span>{analyzing ? t("analyzingVideo") : t("uploading")}</span>
            <span>{Math.round(progress.percentage)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a1f2e]">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {uploading && progress.total > 0 && (
            <div className="flex items-center justify-between text-[9px] text-white/60">
              <span>
                {formatBytes(progress.uploaded)} / {formatBytes(progress.total)}
              </span>
              {progress.speed > 0 && (
                <span>
                  {formatBytes(progress.speed)}/s {progress.eta > 0 && `• ${formatTime(progress.eta)}`}
                </span>
              )}
              {progress.activeParts > 0 && (
                <span className="text-emerald-400">{progress.activeParts} parts</span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="w-full rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[10px] font-medium text-red-300 hover:bg-red-500/20 transition"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || analyzing || leftSideTeam === null}
        className="h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-[#0b1220] shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {analyzing ? t("analyzingVideo") : uploading ? t("uploading") : leftSideTeam === null ? (t("pleaseSelectTeamSide") || "Επιλέξτε πλευρά ομάδας") : t("uploadAndAnalyze")}
      </button>

      <div className="rounded-lg border border-[#1a1f2e] bg-[#0b1220] p-2 text-[10px] text-white/70">
        <p className="font-medium text-white mb-1">{t("howItWorks")}</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>{t("howItWorks1")}</li>
          <li>{t("howItWorks2")}</li>
          <li>{t("howItWorks3")}</li>
          <li>{t("howItWorks4")}</li>
        </ul>
      </div>
    </form>
  );
}
