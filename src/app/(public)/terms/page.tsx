import type { Metadata } from "next";

import { LegalPageView, legalMetadata } from "@/components/marketing/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("terms", "/terms");
}

export default function Page() {
  return <LegalPageView slug="terms" />;
}
