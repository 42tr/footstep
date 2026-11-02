import type { Metadata } from "next";
import { GrowthView } from "@/components/growth-view";
import { OnboardingCard } from "@/components/onboarding";
import { listGrowth } from "@/lib/data";
import { loadPageData } from "@/lib/page-data";
import { serializeGrowth } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "成长曲线" };

export default async function GrowthPage() {
  const { child } = await loadPageData();
  if (!child) return <OnboardingCard />;

  const rows = await listGrowth(child.id);
  return <GrowthView child={child} growth={rows.map(serializeGrowth)} />;
}
