import type { Metadata } from "next";

import Dashboard from "@/components/dashboard/Dashboard";
import { listDesigns } from "@/lib/designs";

export const metadata: Metadata = { title: "Drafts – Canvo" };

// The list changes whenever anyone edits anything, so it is never prerendered.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const designs = await listDesigns();

  return <Dashboard designs={designs} />;
}
