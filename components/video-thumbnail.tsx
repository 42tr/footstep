"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** 从视频中段截取封面，避开不少手机视频开头的黑帧。 */
export function VideoThumbnail({
  src,
  durationMs,
  className,
}: {
  src: string;
  durationMs: number | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function captureFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      setPoster(canvas.toDataURL("image/jpeg", 0.82));
    } catch {
      setFailed(true);
    }
  }

  function seekToPreview() {
    const video = videoRef.current;
    if (!video) return;
    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : (durationMs ?? 0) / 1000;
    if (duration <= 0) {
      captureFrame();
      return;
    }
    video.currentTime = Math.min(duration * 0.35, Math.max(0, duration - 0.1));
  }

  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className={className} />
      ) : (
        <span className={cn("block bg-cream-deep", className)} aria-hidden="true" />
      )}
      {!poster && !failed && (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={seekToPreview}
          onSeeked={captureFrame}
          onLoadedData={() => {
            if (videoRef.current?.currentTime === 0) captureFrame();
          }}
          onError={() => setFailed(true)}
          className="pointer-events-none absolute h-px w-px opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
    </>
  );
}
