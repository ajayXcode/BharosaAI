import type { Metadata } from "next";
import { CustomerApp } from "@/components/CustomerApp";

export const metadata: Metadata = {
  title: "Customer app",
  description:
    "Bharosa AI customer journey — plain-language summary, red flags with citations, cited questions and a consent-first next step.",
};

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  return <CustomerApp embed={params.embed === "1"} />;
}
