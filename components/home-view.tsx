"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CloudUpload, Heart, Plus, Sparkles } from "lucide-react";
import { EmptyState, FootDivider, SectionCard, StatTile } from "@/components/common";
import { Btn } from "@/components/controls";
import { Lightbox } from "@/components/lightbox";
import { MediaStrip, MediaTile } from "@/components/media-grid";
import { MomentDialog } from "@/components/moment-dialog";
import { UploadButton } from "@/components/uploader";
import { cn } from "@/lib/utils";
import { FIRST_PRESETS, PRESET_MAP } from "@/lib/firsts";
import { categoryStyle } from "@/lib/ui-tokens";
import { formatYmdCn, relativeDayCn, todayYmd, weekdayCn } from "@/lib/time";
import type { Child, FirstItem, GrowthItem, MediaItem, MomentItem } from "@/lib/types";

export type HomeStats = {
  photos: number;
  videos: number;
  moments: number;
  firstsDone: number;
  growthRecords: number;
};

/** 根据月龄挑出「现在最可能正在发生」的几个第一次。 */
function stageFor(decimalMonths: number): string {
  if (decimalMonths < 3) return "新生 0-3个月";
  if (decimalMonths < 6) return "翻身期 3-6个月";
  if (decimalMonths < 12) return "爬行期 6-12个月";
  if (decimalMonths < 24) return "学步期 1-2岁";
  if (decimalMonths < 36) return "语言期 2-3岁";
  return "幼儿园 3-6岁";
}

export function HomeView({
  child,
  stats,
  moments,
  media,
  firsts,
  growth,
}: {
  child: Child;
  stats: HomeStats;
  moments: MomentItem[];
  media: MediaItem[];
  firsts: FirstItem[];
  growth: GrowthItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(media);
  const [viewer, setViewer] = useState<{ list: MediaItem[]; index: number } | null>(null);
  const [momentOpen, setMomentOpen] = useState(false);
  const [momentList, setMomentList] = useState(moments);

  const suggestions = useMemo(() => {
    const done = new Set(firsts.map((f) => f.presetKey).filter(Boolean));
    const stage = stageFor(child.decimalMonths);
    const inStage = FIRST_PRESETS.filter((p) => p.stage === stage && !done.has(p.key));
    const festival = FIRST_PRESETS.filter((p) => p.stage === "节日与纪念" && !done.has(p.key)).slice(0, 2);
    return [...inStage, ...festival].slice(0, 6);
  }, [firsts, child.decimalMonths]);

  const recentMoments = momentList.slice(0, 3);
  const mediaById = useMemo(() => new Map(items.map((m) => [m.id, m])), [items]);
  const latestGrowth = growth[growth.length - 1] ?? null;
  const previousGrowth = growth.length > 1 ? growth[growth.length - 2] : null;

  return (
    <>
      {/* ===== 档案卡 ===== */}
      <section className="scrap-card relative mb-5 overflow-hidden">
        <span className="tape -left-6 top-5 -rotate-[24deg]" aria-hidden />
        <span className="tape -right-6 bottom-6 -rotate-[24deg]" aria-hidden />
        <div className="grid gap-5 p-5 sm:p-7 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <div className="relative mx-auto md:mx-0">
            <div className="rotate-[-3deg] rounded-[20px] border border-line bg-paper p-2.5 pb-6 shadow-[0_16px_36px_-22px_rgba(90,64,36,.9)]">
              <div
                className="h-[132px] w-[132px] overflow-hidden rounded-xl sm:h-[152px] sm:w-[152px]"
                style={{ background: `color-mix(in srgb, ${child.tint} 14%, #fffdf8)` }}
              >
                {child.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={child.avatarUrl} alt={`${child.nickname || child.name}的头像`} className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="font-display flex h-full w-full items-center justify-center text-5xl font-bold"
                    style={{ color: child.tint }}
                  >
                    {(child.nickname || child.name).trim().slice(0, 1)}
                  </span>
                )}
              </div>
              <p className="font-hand absolute inset-x-0 bottom-1.5 text-center text-[13px] text-ink-soft">
                {formatYmdCn(child.birthDate)}
              </p>
            </div>
          </div>

          <div className="min-w-0 text-center md:text-left">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium"
                style={{ background: `color-mix(in srgb, ${child.tint} 15%, transparent)`, color: child.tint }}
              >
                <Sparkles className="h-3 w-3" />
                今天是你来到这个世界的第 <span className="tabular-nums">{child.ageDays}</span> 天
              </span>
            </div>

            <h1 className="font-display text-[34px] font-bold leading-tight text-ink sm:text-[42px]">
              {child.nickname || child.name}
              {child.name && child.nickname && (
                <span className="ml-2.5 align-middle text-base font-medium text-ink-soft">{child.name}</span>
              )}
            </h1>

            <p className="mt-1.5 font-display text-lg text-terracotta sm:text-xl">
              {child.ageLong}
              <span className="ml-2 text-sm text-ink-soft">
                {formatYmdCn(child.birthDate)} {weekdayCn(child.birthDate)}
                {child.birthTime ? ` ${child.birthTime}` : ""}
              </span>
            </p>

            <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-soft md:justify-start">
              {child.zodiac && <span>属{child.zodiac}</span>}
              {child.constellation && <span>· {child.constellation}</span>}
              {child.birthWeightKg && <span>· 出生 {child.birthWeightKg}kg</span>}
              {child.birthHeightCm && <span>/ {child.birthHeightCm}cm</span>}
            </p>

            {child.bio && (
              <p className="font-hand mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink/80 md:mx-0">
                「{child.bio}」
              </p>
            )}

            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              <UploadButton
                childId={child.id}
                label="传照片 / 视频"
                icon={<CloudUpload className="h-4 w-4" />}
                onUploaded={(added) => setItems((prev) => [...added, ...prev])}
              />
              <Btn variant="soft" icon={<Plus className="h-4 w-4" />} onClick={() => setMomentOpen(true)}>
                记一笔
              </Btn>
              <Link href="/settings">
                <Btn variant="outline">改资料</Btn>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 数据速览 ===== */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile emoji="📷" label="照片" value={stats.photos} unit="张" tint="#E2795B" />
        <StatTile emoji="🎬" label="视频" value={stats.videos} unit="个" tint="#8FB9D9" />
        <StatTile emoji="📖" label="时间线记录" value={stats.moments} unit="条" tint="#7FA98B" />
        <StatTile emoji="🌟" label="已打卡的第一次" value={stats.firstsDone} unit={`/${FIRST_PRESETS.length}`} tint="#F0A35E" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* 最新照片 */}
          <SectionCard
            title="最新的照片"
            emoji="🖼️"
            action={
              <Link href="/gallery" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft transition hover:text-terracotta">
                去相册 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {items.length === 0 ? (
              <EmptyState
                emoji="📷"
                title="还没有照片"
                hint="传第一张照片，这里就会变成一面照片墙。"
                className="border-0 bg-transparent py-8"
                action={
                  <UploadButton
                    childId={child.id}
                    label="上传照片"
                    onUploaded={(added) => setItems((prev) => [...added, ...prev])}
                  />
                }
              />
            ) : (
              <MediaStrip items={items.slice(0, 16)} onOpen={(i) => setViewer({ list: items.slice(0, 16), index: i })} />
            )}
          </SectionCard>

          {/* 最近的瞬间 */}
          <SectionCard
            title="最近的瞬间"
            emoji="📖"
            action={
              <Link href="/timeline" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft transition hover:text-terracotta">
                全部 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentMoments.length === 0 ? (
              <EmptyState
                emoji="✏️"
                title="还没写下什么"
                hint="哪怕只是「今天睡了个整觉」，也值得记一笔。"
                className="border-0 bg-transparent py-8"
                action={<Btn icon={<Plus className="h-4 w-4" />} onClick={() => setMomentOpen(true)}>记一笔</Btn>}
              />
            ) : (
              <ul className="space-y-2.5">
                {recentMoments.map((moment) => {
                  const style = categoryStyle(moment.category);
                  const thumbs = moment.mediaIds
                    .map((id) => mediaById.get(id))
                    .filter((m): m is MediaItem => Boolean(m))
                    .slice(0, 4);
                  return (
                    <li key={moment.id} className="rounded-2xl border border-line bg-paper/70 p-3.5 transition hover:border-apricot/60">
                      <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
                          style={{ background: style.bg, color: style.ink }}
                        >
                          <span aria-hidden>{style.emoji}</span>
                          {style.label}
                        </span>
                        <span className="text-ink-soft">{relativeDayCn(moment.happenedOn)}</span>
                        <span className="text-ink-soft/60">{formatYmdCn(moment.happenedOn)}</span>
                      </div>
                      <p className="font-display mt-1.5 text-[15px] font-bold leading-snug text-ink">{moment.title}</p>
                      {moment.body && (
                        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{moment.body}</p>
                      )}
                      {thumbs.length > 0 && (
                        <div className="mt-2.5 flex gap-2">
                          {thumbs.map((t, i) => (
                            <div key={t.id} className="w-16">
                              <MediaTile
                                item={t}
                                showCaption={false}
                                onClick={() => setViewer({ list: thumbs, index: i })}
                                className="rounded-xl"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          {/* 成长速览 */}
          <SectionCard
            title="成长速览"
            emoji="📈"
            action={
              <Link href="/growth" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft transition hover:text-terracotta">
                看曲线 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {latestGrowth ? (
              <div className="space-y-2.5">
                <Row label="身高" value={latestGrowth.heightCm} unit="cm" prev={previousGrowth?.heightCm ?? null} />
                <Row label="体重" value={latestGrowth.weightKg} unit="kg" prev={previousGrowth?.weightKg ?? null} />
                <Row label="头围" value={latestGrowth.headCm} unit="cm" prev={previousGrowth?.headCm ?? null} />
                <p className="pt-0.5 text-[11.5px] text-ink-soft">
                  {formatYmdCn(latestGrowth.recordedOn)} 测的 · 共 {stats.growthRecords} 次记录
                </p>
              </div>
            ) : (
              <EmptyState
                emoji="📏"
                title="还没量过"
                hint="记下身高体重，就能看到TA长大的曲线。"
                className="border-0 bg-transparent py-8"
                action={
                  <Link href="/growth">
                    <Btn variant="soft" size="sm">去记一次</Btn>
                  </Link>
                }
              />
            )}
          </SectionCard>

          {/* 下一个第一次 */}
          <SectionCard
            title="接下来可能会…"
            emoji="🌱"
            action={
              <Link href="/firsts" className="inline-flex items-center gap-1 text-[12.5px] text-ink-soft transition hover:text-terracotta">
                全部 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {suggestions.length === 0 ? (
              <p className="py-3 text-center text-[13px] text-ink-soft">
                这个阶段的「第一次」都收集完啦，太厉害了。
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {suggestions.map((preset) => (
                  <li key={preset.key}>
                    <Link
                      href="/firsts"
                      className="dashed-frame flex items-center gap-2.5 bg-paper/50 p-2.5 transition hover:border-apricot hover:bg-accent/40"
                      style={{ borderRadius: "1rem" }}
                    >
                      <span className="sticker h-9 w-9 shrink-0 bg-cream-deep text-base opacity-70" aria-hidden>
                        {preset.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium text-ink">{preset.label}</span>
                        <span className="block truncate text-[10.5px] text-ink-soft/80">{preset.hint}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2.5 text-[11px] leading-relaxed text-ink-soft/75">
              参考月龄只是常见范围，早一点晚一点都很正常。
            </p>
          </SectionCard>

          {/* 最近的第一次 */}
          {firsts.filter((f) => f.achievedOn).length > 0 && (
            <SectionCard title="最近收集到的" emoji="🌟">
              <ul className="space-y-2">
                {[...firsts]
                  .filter((f) => f.achievedOn)
                  .sort((a, b) => (b.achievedOn ?? "").localeCompare(a.achievedOn ?? ""))
                  .slice(0, 4)
                  .map((f) => (
                    <li key={f.id} className="flex items-center gap-2.5 rounded-xl bg-cream-deep/50 px-3 py-2">
                      <span className="text-lg" aria-hidden>
                        {f.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {f.label || PRESET_MAP[f.presetKey]?.label}
                        </span>
                        <span className="block text-[11px] text-ink-soft">
                          {f.achievedOn ? `${relativeDayCn(f.achievedOn)}` : ""}
                          {f.ageDays !== null ? ` · ${f.ageDays}天大` : ""}
                        </span>
                      </span>
                      <Heart className="h-3.5 w-3.5 shrink-0 text-coral/70" />
                    </li>
                  ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <FootDivider className="mt-8" />
      <p className={cn("mt-3 text-center font-hand text-[13.5px] text-ink-soft/80")}>
        今天是 {formatYmdCn(todayYmd())} {weekdayCn(todayYmd())}，也值得记一笔。
      </p>

      <MomentDialog
        open={momentOpen}
        childId={child.id}
        childBirthDate={child.birthDate}
        media={items}
        editing={null}
        onClose={() => setMomentOpen(false)}
        onSaved={(moment) => {
          setMomentList((prev) => [moment, ...prev.filter((m) => m.id !== moment.id)]);
          setMomentOpen(false);
          router.refresh();
        }}
      />

      <Lightbox
        items={viewer?.list ?? []}
        index={viewer?.index ?? null}
        onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
        onClose={() => setViewer(null)}
        onChange={(u) => setItems((prev) => prev.map((m) => (m.id === u.id ? u : m)))}
        onDelete={(id) => {
          setItems((prev) => prev.filter((m) => m.id !== id));
          setViewer((v) => {
            if (!v) return null;
            const next = v.list.filter((m) => m.id !== id);
            return next.length ? { list: next, index: Math.min(v.index, next.length - 1) } : null;
          });
        }}
      />
    </>
  );
}

function Row({
  label,
  value,
  unit,
  prev,
}: {
  label: string;
  value: number | null;
  unit: string;
  prev: number | null;
}) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-cream-deep/40 px-3 py-2">
        <span className="text-[12.5px] text-ink-soft">{label}</span>
        <span className="text-[12.5px] text-ink-soft/50">没记录</span>
      </div>
    );
  }
  const delta = prev === null ? null : value - prev;
  return (
    <div className="flex items-center justify-between rounded-xl bg-cream-deep/40 px-3 py-2">
      <span className="text-[12.5px] text-ink-soft">{label}</span>
      <span className="flex items-baseline gap-1.5">
        {delta !== null && Math.abs(delta) > 0.001 && (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              delta > 0 ? "text-[#4d7357]" : "text-[#8a6a15]",
            )}
          >
            {delta > 0 ? "↑" : "↓"}
            {Math.abs(delta).toFixed(unit === "kg" ? 2 : 1)}
          </span>
        )}
        <span className="font-display text-lg font-bold tabular-nums text-ink">{value}</span>
        <span className="text-[11px] text-ink-soft">{unit}</span>
      </span>
    </div>
  );
}
