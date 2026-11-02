import type { Metadata } from "next";
import { OnboardingCard } from "@/components/onboarding";
import { TimelineView } from "@/components/timeline-view";
import { listMedia, listMoments } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";
import { serializeMedia, serializeMoment } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "成长时间线" };

export default async function TimelinePage() {
  const { child } = await loadPageData();
  if (!child) return <OnboardingCard />;

  const [momentRows, mediaRows] = await Promise.all([listMoments(child.id, 400), listMedia(child.id, 800)]);
  return (
    <TimelineView
      child={child}
      moments={momentRows.map(serializeMoment)}
      media={mediaRows.map(serializeMedia)}
    />
  );
}
