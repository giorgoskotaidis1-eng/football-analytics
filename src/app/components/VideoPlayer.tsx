"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  src?: string;       // πλήρες URL ή relative
  startTime?: number; // seconds
  autoPlay?: boolean;
};

// Helper to detect MIME type from URL
function getMimeType(src: string): string {
  const ext = src.toLowerCase().split(".").pop() || "";
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    m3u8: "application/vnd.apple.mpegurl",
    mkv: "video/x-matroska",
    flv: "video/x-flv",
  };
  return mimeMap[ext] || "video/mp4";
}

export function VideoPlayer({ src, startTime = 0, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset error κάθε φορά που αλλάζει src
  useEffect(() => {
    setErrorMsg(null);
    setIsLoading(true);
    setVideoDuration(null);
    console.log(`[VideoPlayer] Source changed to: ${src}`);
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Set timeout: if video doesn't load in 10 seconds, show error
    loadingTimeoutRef.current = setTimeout(() => {
      if (isLoading && videoRef.current && videoRef.current.readyState < 2) {
        console.error("[VideoPlayer] Loading timeout - video not ready after 10s");
        setErrorMsg("Video loading timeout. The file may be too large or the server is slow. Try refreshing.");
        setIsLoading(false);
      }
    }, 10000);
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [src, isLoading]);

  // HLS attach (μόνο όταν src τελειώνει σε .m3u8 και υποστηρίζεται)
  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    const isHls = src.endsWith(".m3u8") || src.includes(".m3u8");

    if (isHls) {
      // Native HLS support (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch (err) {
            console.warn("[VideoPlayer] Error destroying HLS instance:", err);
          }
          hlsRef.current = null;
        }
        return;
      }

      // HLS.js for other browsers (dynamic import)
      import("hls.js")
        .then((module) => {
          const Hls = (module.default || module) as any;
          if (!Hls || typeof Hls.isSupported !== "function" || !Hls.isSupported()) {
            setErrorMsg("HLS streaming not supported in this browser.");
            return;
          }

          if (hlsRef.current) {
            try {
              hlsRef.current.destroy();
            } catch (err) {
              console.warn("[VideoPlayer] Error destroying old HLS instance:", err);
            }
          }

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 30, // Reduce buffer to prevent stuttering
            maxMaxBufferLength: 60,
            maxBufferSize: 60 * 1000 * 1000, // 60MB max buffer
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          hlsRef.current = hls;

          hls.on(Hls.Events?.ERROR || "hlsError", (event: any, data: any) => {
            console.warn("HLS error", data);
            setErrorMsg(`HLS error: ${data.type} - ${data.details}`);
            if (data && data.fatal) {
              if (data.type === Hls.ErrorTypes?.NETWORK_ERROR) {
                hls.startLoad();
              } else if (data.type === Hls.ErrorTypes?.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                hls.destroy();
                setErrorMsg("HLS fatal error. Please try again.");
              }
            }
          });
        })
        .catch((err) => {
          console.warn("hls.js not available:", err);
          setErrorMsg("HLS module not available. Install hls.js for .m3u8 support, or use Safari for native HLS.");
        });

      return () => {
        if (hlsRef.current) {
          try {
            hlsRef.current.destroy();
          } catch (err) {
            console.warn("[VideoPlayer] Error destroying HLS instance:", err);
          }
          hlsRef.current = null;
        }
      };
    } else {
      // For non-HLS videos, ensure HLS is destroyed and set src directly
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (err) {
          console.warn("[VideoPlayer] Error destroying HLS instance:", err);
        }
        hlsRef.current = null;
      }
      // Reset video element before setting new src
      video.pause();
      video.removeAttribute("src");
      video.load();
      // Set new src
      video.src = src;
      console.log(`[VideoPlayer] Set video src to: ${src}`);
    }
  }, [src]);

  // Seek όταν αλλάζει startTime ή src (χωρίς remount)
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Wait for video to be ready before seeking
    const video = videoRef.current;
    if (video.readyState >= 2) {
      // Video has enough data to seek
      if (startTime >= 0) {
        try {
          video.currentTime = startTime;
          console.log(`[VideoPlayer] useEffect: seeking to ${startTime}s (src=${src})`);
          video.play().catch((err) => {
            console.warn("[VideoPlayer] play failed after seek:", err);
          });
        } catch (err) {
          console.error("[VideoPlayer] Seek error in useEffect:", err);
        }
      }
    } else {
      // Video not ready yet, will seek in onLoadedMetadata
      console.log(`[VideoPlayer] Video not ready yet (readyState=${video.readyState}), will seek in onLoadedMetadata`);
    }
  }, [startTime, src]);

  if (!src) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <p className="text-slate-400 text-sm">No video for this event</p>
      </div>
    );
  }

  const isHls = src.endsWith(".m3u8") || src.includes(".m3u8");
  const mimeType = getMimeType(src);

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        autoPlay={false}
        className="w-full rounded-lg shadow-xl bg-black"
        style={{ maxHeight: "600px" }}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          const duration = videoRef.current.duration;
          const video = videoRef.current;
          console.log(`[VideoPlayer] Metadata loaded: duration=${duration}, src=${video.currentSrc}, readyState=${video.readyState}`);
          if (duration && !isNaN(duration) && isFinite(duration)) {
            setVideoDuration(duration);
            console.log(`[VideoPlayer] Video duration: ${duration.toFixed(2)}s (${(duration / 60).toFixed(2)} minutes)`);
          }
          // Seek and play in onLoadedMetadata (once)
          if (startTime >= 0) {
            try {
              video.currentTime = startTime;
              console.log(`[VideoPlayer] onLoadedMetadata: seeking to ${startTime}s`);
            } catch (err) {
              console.error("[VideoPlayer] Seek error in onLoadedMetadata:", err);
            }
          }
          // Explicitly call play() after seek
          video.play().catch((err) => {
            console.warn("[VideoPlayer] play blocked or failed:", err);
          });
        }}
        onLoadedData={() => {
          // Clear loading timeout
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setErrorMsg(null);
          setIsLoading(false);
          console.log("[VideoPlayer] onLoadedData: video data loaded");
        }}
        onCanPlay={() => {
          // Clear loading timeout
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          setErrorMsg(null);
          setIsLoading(false);
          console.log("[VideoPlayer] onCanPlay: video can play");
        }}
        onProgress={() => {
          if (videoRef.current) {
            const buffered = videoRef.current.buffered;
            if (buffered.length > 0) {
              const bufferedEnd = buffered.end(buffered.length - 1);
              const bufferedPercent = (bufferedEnd / videoRef.current.duration) * 100;
              console.log(`[VideoPlayer] Progress: buffered ${bufferedPercent.toFixed(1)}% (${bufferedEnd.toFixed(1)}s / ${videoRef.current.duration.toFixed(1)}s)`);
            }
          }
        }}
        onWaiting={() => {
          const currentTime = videoRef.current?.currentTime;
          console.warn("[VideoPlayer] waiting (buffering) at", currentTime, "s");
          setIsLoading(true);
        }}
        onPlaying={() => {
          setIsLoading(false);
          console.log("[VideoPlayer] Video playing");
        }}
        onSeeking={() => setIsLoading(true)}
        onSeeked={() => setIsLoading(false)}
        onStalled={() => {
          const currentTime = videoRef.current?.currentTime;
          console.warn("[VideoPlayer] stalled at", currentTime, "s");
          setIsLoading(true);
        }}
        onError={(e) => {
          setIsLoading(false);
          const v = e.currentTarget;
          const ve = v.error;
          console.error("[VideoPlayer] Video load error:", ve?.code, ve?.message, v.currentSrc);
          
          // More specific error messages
          let errorText = ve
            ? `Video failed (code ${ve.code}${ve.message ? `: ${ve.message}` : ""}). Check URL/CORS/format.`
            : `Video failed. Check URL/CORS/format. src=${v.currentSrc}`;
          
          setErrorMsg(errorText);
        }}
      >
        {!isHls && <source src={src} type={mimeType} />}
        {isHls && <source src={src} type="application/vnd.apple.mpegurl" />}
        Your browser does not support the video tag.
      </video>
      {errorMsg && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
          <p className="text-red-300/70 text-xs mt-1">URL: {src}</p>
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-300"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
