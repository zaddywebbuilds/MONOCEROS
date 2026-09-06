import type { Metadata } from "next";

import { LegalPageView, legalMetadata } from "@/components/marketing/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("risk-disclosure", "/risk-disclosure");
}

export default function Page() {
  return <LegalPageView slug="risk-disclosure" />;
}
