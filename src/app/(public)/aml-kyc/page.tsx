import type { Metadata } from "next";

import { LegalPageView, legalMetadata } from "@/components/marketing/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("aml-kyc", "/aml-kyc");
}

export default function Page() {
  return <LegalPageView slug="aml-kyc" />;
}
