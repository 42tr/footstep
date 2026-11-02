import type { ChildRow, FirstRow, GrowthRow, MediaRow, MomentRow } from "@/db/schema";
import { fileUrl } from "@/lib/media-url";
import { parseMediaIds } from "@/lib/data";
import { TINTS, type Child, type FirstItem, type GrowthItem, type MediaItem, type MomentItem } from "@/lib/types";
import {
  computeAge,
  constellationCn,
  formatAge,
  formatAgeLong,
  todayYmd,
  zodiacCn,
} from "@/lib/time";

export function serializeMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    childId: row.childId,
    kind: row.kind === "video" ? "video" : "photo",
    mime: row.mime,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    takenAt: row.takenAt,
    caption: row.caption,
    album: row.album,
    favorite: row.favorite,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt,
    url: fileUrl(row.fileKey) ?? "",
    thumbUrl: fileUrl(row.thumbKey),
  };
}

export function serializeMoment(row: MomentRow): MomentItem {
  return {
    id: row.id,
    childId: row.childId,
    happenedOn: row.happenedOn,
    title: row.title,
    body: row.body,
    category: row.category,
    mediaIds: parseMediaIds(row.mediaIds),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function serializeGrowth(row: GrowthRow): GrowthItem {
  return {
    id: row.id,
    childId: row.childId,
    recordedOn: row.recordedOn,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    headCm: row.headCm,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

export function serializeFirst(row: FirstRow, mediaLookup?: Record<number, MediaRow>): FirstItem {
  const linked = row.mediaId ? mediaLookup?.[row.mediaId] : undefined;
  return {
    id: row.id,
    childId: row.childId,
    presetKey: row.presetKey,
    label: row.label,
    emoji: row.emoji,
    achievedOn: row.achievedOn,
    ageDays: row.ageDays,
    note: row.note,
    mediaId: row.mediaId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    mediaUrl: linked ? fileUrl(linked.fileKey) : null,
    thumbUrl: linked ? (fileUrl(linked.thumbKey) ?? fileUrl(linked.fileKey)) : null,
  };
}

export function serializeChild(row: ChildRow, index = 0): Child {
  const age = computeAge(row.birthDate, todayYmd());
  return {
    ...row,
    avatarUrl: fileUrl(row.avatarKey),
    ageLabel: formatAge(age),
    ageLong: formatAgeLong(age),
    ageDays: age?.totalDays ?? 0,
    decimalMonths: age?.decimalMonths ?? 0,
    zodiac: zodiacCn(row.birthDate),
    constellation: constellationCn(row.birthDate),
    tint: TINTS[index % TINTS.length],
  };
}
