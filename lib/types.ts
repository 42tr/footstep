export type Child = {
  id: number;
  name: string;
  nickname: string;
  birthDate: string;
  birthTime: string;
  sex: "boy" | "girl" | "unknown" | string;
  avatarKey: string | null;
  bio: string;
  birthWeightKg: number | null;
  birthHeightCm: number | null;
  sortOrder: number;
  createdAt: string;
  avatarUrl: string | null;
  ageLabel: string;
  ageLong: string;
  ageDays: number;
  decimalMonths: number;
  zodiac: string | null;
  constellation: string | null;
  tint: string;
};

export type MediaItem = {
  id: number;
  childId: number;
  kind: "photo" | "video";
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  takenAt: string | null;
  caption: string;
  album: string;
  favorite: boolean;
  uploadedBy: string;
  createdAt: string;
  url: string;
  thumbUrl: string | null;
};

export type MomentItem = {
  id: number;
  childId: number;
  happenedOn: string;
  title: string;
  body: string;
  category: string;
  mediaIds: number[];
  createdBy: string;
  createdAt: string;
};

export type GrowthItem = {
  id: number;
  childId: number;
  recordedOn: string;
  heightCm: number | null;
  weightKg: number | null;
  headCm: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
};

export type FirstItem = {
  id: number;
  childId: number;
  presetKey: string;
  label: string;
  emoji: string;
  achievedOn: string | null;
  ageDays: number | null;
  note: string;
  mediaId: number | null;
  createdBy: string;
  createdAt: string;
  mediaUrl?: string | null;
  thumbUrl?: string | null;
};

export const TINTS = ["#E2795B", "#7FA98B", "#8FB9D9", "#F0A35E", "#B58BB0", "#EE8F7D"];
