"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_BLACK_FRAME_SEEKS = 10;

function readFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 只读取缩小后的像素，避免每次取帧都扫描整张高清封面。
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = 32;
  sampleCanvas.height = 32;
  const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("Canvas is unavailable");
  sampleContext.drawImage(video, 0, 0, 32, 32);
  const pixels = sampleContext.getImageData(0, 0, 32, 32).data;
  let luminanceTotal = 0;
  let nearBlackPixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    luminanceTotal += luminance;
    if (luminance < 32) nearBlackPixels += 1;
  }
  const brightness = luminanceTotal / (pixels.length / 4);
  const isBlack = brightness < 18 && nearBlackPixels / (pixels.length / 4) > 0.95;

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.82), brightness, isBlack };
}

/** 从开头向后取帧，跳过视频开头的黑场。 */
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
  const durationRef = useRef(0);
  const seekCountRef = useRef(0);
  const brightestFrameRef = useRef<{ dataUrl: string; brightness: number } | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function captureFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    try {
      const frame = readFrame(video);
      if (!frame.isBlack) {
        setPoster(frame.dataUrl);
        return;
      }

      if (!brightestFrameRef.current || frame.brightness > brightestFrameRef.current.brightness) {
        brightestFrameRef.current = frame;
      }

      const duration = durationRef.current;
      const lastTime = Math.max(0, duration - 0.05);
      const nextSeekCount = seekCountRef.current + 1;
      const step = Math.max(0.5, duration / MAX_BLACK_FRAME_SEEKS);
      const nextTime = Math.min(lastTime, 0.1 + nextSeekCount * step);
      if (nextSeekCount >= MAX_BLACK_FRAME_SEEKS || nextTime <= video.currentTime + 0.01) {
        // 整段都是黑场时，也要留下实际视频帧，而不是黑色占位图。
        setPoster(brightestFrameRef.current.dataUrl);
        return;
      }
      seekCountRef.current = nextSeekCount;
      video.currentTime = nextTime;
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
    durationRef.current = duration;
    seekCountRef.current = 0;
    brightestFrameRef.current = null;
    if (duration <= 0) {
      captureFrame();
      return;
    }
    video.currentTime = Math.min(0.1, Math.max(0, duration - 0.05));
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
