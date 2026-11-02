import type { MediaItem } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const THUMB_MAX = 720;

export type UploadStatus = "pending" | "preparing" | "uploading" | "saving" | "done" | "error";

export type PreparedFile = {
  uid: string;
  uploadId: string;
  file: File;
  kind: "photo" | "video";
  status: UploadStatus;
  progress: number;
  error: string | null;
  previewUrl: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  takenAt: string;
  caption: string;
  album: string;
  media: MediaItem | null;
};

export function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function detectKind(file: File): "photo" | "video" | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  return /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(file.name) ? "photo" : null;
}

export function newUploadId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function prepareFile(file: File, album = ""): PreparedFile | null {
  const kind = detectKind(file);
  if (!kind) return null;
  const modified = file.lastModified ? new Date(file.lastModified) : new Date();
  return {
    uid: newUploadId(),
    uploadId: newUploadId(),
    file,
    kind,
    status: "pending",
    progress: 0,
    error: null,
    previewUrl: URL.createObjectURL(file),
    width: null,
    height: null,
    durationMs: null,
    takenAt: toYmdLocal(modified),
    caption: "",
    album,
    media: null,
  };
}

/** 用 XHR 才能拿到真实的上传进度。 */
function xhrPut(url: string, blob: Blob, contentType: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = `上传失败（${xhr.status}）`;
      try {
        const parsed = JSON.parse(xhr.responseText || "{}") as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch {
        /* 保留默认提示 */
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("网络中断了，检查一下连接再试一次"));
    xhr.ontimeout = () => reject(new Error("上传超时了"));
    xhr.send(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

function fit(w: number, h: number, max: number) {
  if (!w || !h) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

async function drawToThumb(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  const { width, height } = fit(w, h, THUMB_MAX);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return canvasToBlob(canvas);
}

async function imageMeta(file: File): Promise<{ width: number; height: number; bitmap: ImageBitmap | HTMLImageElement | null }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bitmap.width, height: bitmap.height, bitmap };
  } catch {
    // 老浏览器或 HEIC 之类，退回 <img>
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      const done = (w: number, h: number, el: HTMLImageElement | null) => {
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h, bitmap: el });
      };
      img.onload = () => done(img.naturalWidth, img.naturalHeight, img);
      img.onerror = () => done(0, 0, null);
      setTimeout(() => done(0, 0, null), 12000);
      img.src = url;
    });
  }
}

function videoMeta(file: File): Promise<{
  width: number;
  height: number;
  durationMs: number | null;
  frame: HTMLVideoElement | null;
  revoke: () => void;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const bail = () => {
      resolve({ width: 0, height: 0, durationMs: null, frame: null, revoke: () => URL.revokeObjectURL(url) });
    };
    const timer = setTimeout(bail, 20000);
    video.onerror = () => {
      clearTimeout(timer);
      bail();
    };
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null;
      const target = Math.min(1.2, (video.duration || 2) / 3);
      const seekTimer = setTimeout(() => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationMs,
          frame: null,
          revoke: () => URL.revokeObjectURL(url),
        });
      }, 8000);
      video.onseeked = () => {
        clearTimeout(seekTimer);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationMs,
          frame: video,
          revoke: () => URL.revokeObjectURL(url),
        });
      };
      try {
        video.currentTime = target;
      } catch {
        clearTimeout(seekTimer);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationMs,
          frame: null,
          revoke: () => URL.revokeObjectURL(url),
        });
      }
    };
    video.src = url;
  });
}

/** 在浏览器里把缩略图做出来，服务器就不用转码，R2 也只存一份小图。 */
export async function buildThumb(
  prepared: PreparedFile,
): Promise<{ blob: Blob | null; width: number | null; height: number | null; durationMs: number | null }> {
  if (prepared.kind === "photo") {
    const { width, height, bitmap } = await imageMeta(prepared.file);
    if (!bitmap) return { blob: null, width: width || null, height: height || null, durationMs: null };
    const blob = await drawToThumb(bitmap, width, height);
    if ("close" in bitmap) (bitmap as ImageBitmap).close();
    return { blob, width: width || null, height: height || null, durationMs: null };
  }

  const { width, height, durationMs, frame, revoke } = await videoMeta(prepared.file);
  let blob: Blob | null = null;
  if (frame) {
    blob = await drawToThumb(frame, width, height);
    frame.removeAttribute("src");
    frame.load();
  }
  revoke();
  return { blob, width: width || null, height: height || null, durationMs };
}

export type UploadCallbacks = {
  onStatus?: (uid: string, patch: Partial<PreparedFile>) => void;
};

/** 单个文件：原图流式直传 → 缩略图直传 → 落库。 */
export async function uploadPrepared(
  prepared: PreparedFile,
  childId: number,
  cb: UploadCallbacks = {},
): Promise<MediaItem> {
  const patch = (p: Partial<PreparedFile>) => cb.onStatus?.(prepared.uid, p);

  if (prepared.file.size > MAX_UPLOAD_BYTES) {
    const message = `文件超过 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB，先压缩一下再传吧`;
    patch({ status: "error", error: message });
    throw new Error(message);
  }

  patch({ status: "preparing" });
  let width = prepared.width;
  let height = prepared.height;
  let durationMs = prepared.durationMs;
  try {
    const thumb = await buildThumb(prepared);
    width = thumb.width ?? width;
    height = thumb.height ?? height;
    durationMs = thumb.durationMs ?? durationMs;
    patch({ width, height, durationMs });

    const base = `/api/upload?childId=${childId}&uploadId=${encodeURIComponent(prepared.uploadId)}`;

    patch({ status: "uploading", progress: 0 });
    await xhrPut(
      `${base}&scope=m`,
      prepared.file,
      prepared.file.type || "application/octet-stream",
      (p) => patch({ progress: p }),
    );

    if (thumb.blob) {
      await xhrPut(`${base}&scope=t`, thumb.blob, "image/jpeg", () => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    patch({ status: "error", error: message });
    throw error instanceof Error ? error : new Error(message);
  }

  patch({ status: "saving", progress: 1 });
  const res = await fetch("/api/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      childId,
      uploadId: prepared.uploadId,
      kind: prepared.kind,
      mime: prepared.file.type,
      width,
      height,
      durationMs,
      takenAt: prepared.takenAt,
      caption: prepared.caption,
      album: prepared.album,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    const message = body.error ?? `保存失败（${res.status}）`;
    patch({ status: "error", error: message });
    throw new Error(message);
  }

  const body = (await res.json()) as { media: MediaItem };
  patch({ status: "done", progress: 1, media: body.media });
  return body.media;
}

export async function uploadAvatar(file: File, childId: number): Promise<string> {
  const uploadId = newUploadId();
  const prepared: PreparedFile = {
    ...prepareFile(file)!,
    uploadId,
    kind: "photo",
  };
  const thumb = await buildThumb(prepared);
  const blob = thumb.blob ?? file;
  await xhrPut(
    `/api/upload?childId=${childId}&uploadId=${encodeURIComponent(uploadId)}&scope=a`,
    blob,
    "image/jpeg",
    () => {},
  );
  URL.revokeObjectURL(prepared.previewUrl);
  return uploadId;
}

export function releasePrepared(items: PreparedFile[]) {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}
