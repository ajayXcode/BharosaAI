import type { Metadata } from "next";
import { AdminPanel } from "@/components/AdminPanel";
import { adminDemoCredentials } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin",
  description: "Bharosa AI admin control panel for users and subscription plans.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const demo = adminDemoCredentials();
  return <AdminPanel demoEmail={demo.email} demoPassword={demo.password} />;
}
