"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  src?: string;       // πλήρες URL ή relative
  startTime?: number; // seconds
  autoPlay?: boolean;
};

// Only use crossOrigin for real cross-origin URLs. Same-origin /api/... video must send cookies (auth).
function needsCrossOriginAnonymous(src: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!/^https?:\/\//i.test(src)) return false;
    const u = new URL(src);
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function VideoPlayer({ src, startTime = 0, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityAtRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);

  const markActivity = (reason: string) => {
    lastActivityAtRef.current = Date.now();
    // Keep this log lightweight; it helps diagnose slow servers/tunnels without spamming too much.
    console.log(`[VideoPlayer] activity: ${reason} (t=${lastActivityAtRef.current})`);
  };

  // Reset error κάθε φορά που αλλάζει src
  useEffect(() => {
    setErrorMsg(null);
    setIsLoading(true);
    isLoadingRef.current = true;
    setVideoDuration(null);
    console.log(`[VideoPlayer] Source changed to: ${src}`);
    markActivity("src-change");
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Adaptive timeout:
    // - Some videos (esp. large files / slow servers / tunnels) can legitimately take >10s to reach readyState>=2.
    // - We only fail if there has been no meaningful activity for a while AND the video is still not ready.
    // - We also avoid capturing stale `isLoading` by using a ref.
    const TIMEOUT_MS = 45_000;
    const IDLE_GRACE_MS = 15_000;

    loadingTimeoutRef.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;

      const idleForMs = Date.now() - (lastActivityAtRef.current || 0);
      const notReady = v.readyState < 2;
      const stillLoading = isLoadingRef.current;

      if (stillLoading && notReady && idleForMs >= IDLE_GRACE_MS) {
        console.error(
          "[VideoPlayer] Loading timeout",
          JSON.stringify({
            afterMs: TIMEOUT_MS,
            idleForMs,
            readyState: v.readyState,
            networkState: v.networkState,
            currentSrc: v.currentSrc,
          })
        );
        setErrorMsg(
          "Video loading is taking too long. The file may be large, the server/tunnel may be slow, or the URL may be unreachable. Try refresh, or open the video in a new tab."
        );
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, TIMEOUT_MS);
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [src]);

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
      // Progressive file (mp4/webm): React `src` on <video> is the single source of truth — avoid duplicate <source> + video.src (double fetch / quirks).
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (err) {
          console.warn("[VideoPlayer] Error destroying HLS instance:", err);
        }
        hlsRef.current = null;
      }
      video.pause();
      video.load();
      console.log(`[VideoPlayer] Progressive video src (via element): ${src}`);
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

  const isHls = src.includes(".m3u8");

  return (
    <div className="relative w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      )}
      <video
        ref={videoRef}
        key={isHls ? `hls-${src}` : src}
        controls
        playsInline
        preload="auto"
        src={isHls ? undefined : src}
        {...(needsCrossOriginAnonymous(src) ? { crossOrigin: "anonymous" as const } : {})}
        autoPlay={false}
        className="w-full rounded-lg shadow-xl bg-black"
        style={{ maxHeight: "600px" }}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          const duration = videoRef.current.duration;
          const video = videoRef.current;
          console.log(`[VideoPlayer] Metadata loaded: duration=${duration}, src=${video.currentSrc}, readyState=${video.readyState}`);
          markActivity("loadedmetadata");
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
          isLoadingRef.current = false;
          markActivity("loadeddata");
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
          isLoadingRef.current = false;
          markActivity("canplay");
          console.log("[VideoPlayer] onCanPlay: video can play");
        }}
        onProgress={() => {
          markActivity("progress");
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
          isLoadingRef.current = true;
          markActivity("waiting");
        }}
        onPlaying={() => {
          setIsLoading(false);
          isLoadingRef.current = false;
          markActivity("playing");
          console.log("[VideoPlayer] Video playing");
        }}
        onSeeking={() => {
          setIsLoading(true);
          isLoadingRef.current = true;
          markActivity("seeking");
        }}
        onSeeked={() => {
          setIsLoading(false);
          isLoadingRef.current = false;
          markActivity("seeked");
        }}
        onStalled={() => {
          const currentTime = videoRef.current?.currentTime;
          console.warn("[VideoPlayer] stalled at", currentTime, "s");
          setIsLoading(true);
          isLoadingRef.current = true;
          markActivity("stalled");
        }}
        onError={(e) => {
          setIsLoading(false);
          isLoadingRef.current = false;
          const v = e.currentTarget;
          const ve = v.error;
          console.error("[VideoPlayer] Video load error:", ve?.code, ve?.message, v.currentSrc);
          markActivity("error");
          
          let errorText = ve
            ? `Video failed (code ${ve.code}${ve.message ? `: ${ve.message}` : ""}). Check URL/CORS/format.`
            : `Video failed. Check URL/CORS/format. src=${v.currentSrc}`;

          if (
            typeof src === "string" &&
            src.includes("/api/") &&
            (ve?.code === 2 || ve?.code === 4)
          ) {
            errorText +=
              " Protected API URLs need an active login session; open this URL in a new tab — if you see JSON or a login page, sign in and reload.";
          }

          errorText += ` (readyState=${v.readyState}, networkState=${v.networkState})`;
          
          setErrorMsg(errorText);
        }}
      >
        {/* HLS (hls.js / Safari): src set in effect; progressive: src attribute above. No nested <source> — avoids double loads. */}
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
