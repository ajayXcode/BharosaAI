import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = {
  title: "Analysis workspace",
  description:
    "Bharosa AI workspace — decode a policy or loan KFS, verify red flags against page citations, run deterministic calculators and act with consent.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  return <Dashboard embed={params.embed === "1"} />;
}
