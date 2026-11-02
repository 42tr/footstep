import { OnboardingCard } from "@/components/onboarding";
import { HomeView, type HomeStats } from "@/components/home-view";
import { listFirsts, listGrowth, listMedia, listMoments } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";
import { serializeFirst, serializeGrowth, serializeMedia, serializeMoment } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { child } = await loadPageData();
  if (!child) return <OnboardingCard />;

  const [mediaRows, momentRows, growthRows, firstRows] = await Promise.all([
    listMedia(child.id, 200),
    listMoments(child.id, 50),
    listGrowth(child.id),
    listFirsts(child.id),
  ]);

  const stats: HomeStats = {
    photos: mediaRows.filter((m) => m.kind === "photo").length,
    videos: mediaRows.filter((m) => m.kind === "video").length,
    moments: momentRows.length,
    firstsDone: firstRows.filter((f) => f.achievedOn).length,
    growthRecords: growthRows.length,
  };

  return (
    <HomeView
      child={child}
      stats={stats}
      moments={momentRows.map(serializeMoment)}
      media={mediaRows.map(serializeMedia)}
      firsts={firstRows.map((row) => serializeFirst(row))}
      growth={growthRows.map(serializeGrowth)}
    />
  );
}
