import type { Metadata } from "next";
import { FirstsView } from "@/components/firsts-view";
import { OnboardingCard } from "@/components/onboarding";
import { listFirsts, listMedia } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";
import { serializeFirst, serializeMedia } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "第一次" };

export default async function FirstsPage() {
  const { child } = await loadPageData();
  if (!child) return <OnboardingCard />;

  const [firstRows, mediaRows] = await Promise.all([listFirsts(child.id), listMedia(child.id, 800)]);
  const media = mediaRows.map(serializeMedia);
  const lookup = Object.fromEntries(mediaRows.map((row) => [row.id, row]));
  const firsts = firstRows.map((row) => serializeFirst(row, lookup));

  return <FirstsView child={child} firsts={firsts} media={media} />;
}
