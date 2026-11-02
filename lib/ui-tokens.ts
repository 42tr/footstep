import { CATEGORY_MAP, MOMENT_CATEGORIES } from "@/lib/firsts";

/** 分类的暖色系配色。底色浅、字色深，保证在小尺寸下也读得清。 */
const INK: Record<string, string> = {
  sage: "#5F8A6C",
  apricot: "#C87C33",
  blue: "#5C89AB",
  butter: "#A8811A",
  coral: "#D2694F",
  plum: "#96688F",
};

export function categoryStyle(key: string) {
  const cat = CATEGORY_MAP[key] ?? CATEGORY_MAP.daily;
  const ink = INK[cat.color] ?? INK.apricot;
  return {
    key: cat.key,
    label: cat.label,
    emoji: cat.emoji,
    ink,
    bg: `color-mix(in srgb, ${ink} 13%, transparent)`,
    border: `color-mix(in srgb, ${ink} 28%, transparent)`,
  };
}

export const CATEGORY_OPTIONS = MOMENT_CATEGORIES.map((c) => ({ value: c.key, label: c.label }));
