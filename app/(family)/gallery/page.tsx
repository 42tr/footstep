import type { Metadata } from "next";
import { GalleryView } from "@/components/gallery-view";
import { OnboardingCard } from "@/components/onboarding";
import { listMedia } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";
import { serializeMedia } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "相册" };

export default async function GalleryPage() {
  const { child } = await loadPageData();
  if (!child) return <OnboardingCard />;

  const rows = await listMedia(child.id, 800);
  return <GalleryView child={child} media={rows.map(serializeMedia)} />;
}
