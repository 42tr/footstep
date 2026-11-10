import type { MediaItem } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;
const THUMB_MAX = 720;

export type UploadStatus = "pending" | "preparing" | "uploading" | "saving" | "done" | "duplicate" | "error";

export type PreparedFile = {
  uid: string;
  uploadId: string;
  file: File;
  kind: "photo" | "video";
  status: UploadStatus;
  progress: number;
  /** 当前是第几次尝试（0 = 第一次） */
  attempt: number;
  error: string | null;
  previewUrl: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  takenAt: string;
  caption: string;
  album: string;
  media: MediaItem | null;
  contentHash: string | null;
  duplicateOf: MediaItem | null;
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

/** 给任何一步加上硬超时：宁可没有缩略图，也不能让上传卡住。 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}超时`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
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
    attempt: 0,
    error: null,
    previewUrl: URL.createObjectURL(file),
    width: null,
    height: null,
    durationMs: null,
    takenAt: toYmdLocal(modified),
    caption: "",
    album,
    media: null,
    contentHash: null,
    duplicateOf: null,
  };
}

export type UploadError = Error & { retryable?: boolean };

export class DuplicateUploadError extends Error {
  readonly media: MediaItem;

  constructor(media: MediaItem) {
    super("这个文件已经存在，不会重复上传");
    this.name = "DuplicateUploadError";
    this.media = media;
  }
}

async function sha256File(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("当前浏览器无法计算文件摘要，请通过 HTTPS 访问或更换浏览器");
  }
  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function findDuplicate(childId: number, contentHash: string, bytes: number): Promise<MediaItem | null> {
  const response = await fetch("/api/media/duplicate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ childId, contentHash, bytes }),
  });
  const body = (await response.json().catch(() => ({}))) as { media?: MediaItem | null; error?: string };
  if (!response.ok) throw new Error(body.error ?? `查重失败（${response.status}）`);
  return body.media ?? null;
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

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
      const error: UploadError = new Error(message);
      // 网关超时/限流这类值得重试；4xx 业务错误重试没意义
      error.retryable = RETRYABLE_STATUS.has(xhr.status);
      reject(error);
    };
    // 连接被掐断：手机锁屏、切后台、基站切换、代理超时都走这里
    xhr.onerror = () => {
      const error: UploadError = new Error("连接中断了");
      error.retryable = true;
      reject(error);
    };
    xhr.ontimeout = () => {
      const error: UploadError = new Error("上传超时了");
      error.retryable = true;
      reject(error);
    };
    xhr.send(blob);
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_ATTEMPTS = 3;

/** 网络级失败自动重试（同一个 uploadId 重传是幂等的，服务器直接覆盖）。 */
async function putWithRetry(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: (p: number) => void,
  onAttempt: (attempt: number) => void,
): Promise<void> {
  let lastError: UploadError | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      onAttempt(attempt);
      await sleep(attempt === 1 ? 1500 : 4000);
      onProgress(0);
    }
    try {
      await xhrPut(url, blob, contentType, onProgress);
      return;
    } catch (error) {
      lastError = error instanceof Error ? (error as UploadError) : new Error(String(error));
      if (lastError.retryable === false) break;
    }
  }
  throw lastError ?? new Error("上传失败");
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

type ImageMeta = { width: number; height: number; bitmap: ImageBitmap | HTMLImageElement | null };

async function imageMeta(file: File): Promise<ImageMeta> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await withTimeout(
        createImageBitmap(file, { imageOrientation: "from-image" }),
        5000,
        "解码图片",
      );
      return { width: bitmap.width, height: bitmap.height, bitmap };
    } catch {
      // 解码失败（HEIC、部分内置浏览器）落到 <img> 回退
    }
  }
  return imageMetaViaImg(file);
}

function imageMetaViaImg(file: File): Promise<ImageMeta> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    let settled = false;
    const done = (w: number, h: number, el: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve({ width: w, height: h, bitmap: el });
    };
    img.onload = () => done(img.naturalWidth, img.naturalHeight, img);
    img.onerror = () => done(0, 0, null);
    setTimeout(() => done(0, 0, null), 4000);
    img.src = url;
  });
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
    const timer = setTimeout(bail, 6000);
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
      }, 3000);
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

  patch({ status: "preparing", error: null, duplicateOf: null });
  let contentHash = prepared.contentHash;
  try {
    contentHash ??= await sha256File(prepared.file);
    patch({ contentHash });
    const duplicate = await findDuplicate(childId, contentHash, prepared.file.size);
    if (duplicate) {
      patch({ status: "duplicate", progress: 0, duplicateOf: duplicate });
      throw new DuplicateUploadError(duplicate);
    }
  } catch (error) {
    if (error instanceof DuplicateUploadError) throw error;
    const message = error instanceof Error ? error.message : "文件查重失败";
    patch({ status: "error", error: message });
    throw error instanceof Error ? error : new Error(message);
  }

  let width = prepared.width;
  let height = prepared.height;
  let durationMs = prepared.durationMs;
  let thumbBlob: Blob | null = null;

  // 缩略图是锦上添花：限时 8 秒，失败就跳过，绝不让它挡住原图
  try {
    const thumb = await withTimeout(buildThumb(prepared), 8000, "生成缩略图");
    width = thumb.width ?? width;
    height = thumb.height ?? height;
    durationMs = thumb.durationMs ?? durationMs;
    thumbBlob = thumb.blob;
    patch({ width, height, durationMs });
  } catch {
    thumbBlob = null;
  }

  const base = `/api/upload?childId=${childId}&uploadId=${encodeURIComponent(prepared.uploadId)}`;
  try {
    patch({ status: "uploading", progress: 0, attempt: 0 });
    await putWithRetry(
      `${base}&scope=m`,
      prepared.file,
      prepared.file.type || "application/octet-stream",
      (p) => patch({ progress: p }),
      (attempt) => patch({ attempt, progress: 0, status: "uploading" }),
    );
    if (thumbBlob) {
      await putWithRetry(`${base}&scope=t`, thumbBlob, "image/jpeg", () => {}, () => {});
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "上传失败";
    patch({ status: "error", error: `${message}（已自动重试 ${MAX_ATTEMPTS - 1} 次）` });
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
      contentHash,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; media?: MediaItem };
    if (res.status === 409 && body.media) {
      patch({ status: "duplicate", progress: 0, duplicateOf: body.media, error: null });
      throw new DuplicateUploadError(body.media);
    }
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
  await putWithRetry(
    `/api/upload?childId=${childId}&uploadId=${encodeURIComponent(uploadId)}&scope=a`,
    blob,
    "image/jpeg",
    () => {},
    () => {},
  );
  URL.revokeObjectURL(prepared.previewUrl);
  return uploadId;
}

export function releasePrepared(items: PreparedFile[]) {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}
