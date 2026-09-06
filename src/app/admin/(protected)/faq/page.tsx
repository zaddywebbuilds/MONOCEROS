import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { AddFaqPanel, FaqForm } from "@/components/admin/faq-forms";
import { prisma } from "@/lib/prisma";
import { deleteFaqAction } from "@/server/actions/admin";

export const metadata: Metadata = { title: "FAQ" };

export default async function AdminFaqPage() {
  const faqs = await prisma.faq.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <DashboardPage className="max-w-4xl">
      <PageTitle
        title="Frequently asked questions"
        description="Published questions appear on the public FAQ page and on the homepage."
        actions={<AddFaqPanel />}
      />

      {faqs.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No questions published"
          description="Add your first question so investors can find answers without contacting support."
        />
      ) : (
        <ul className="space-y-4">
          {faqs.map((faq) => (
            <li key={faq.id}>
              <Card className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md border border-ink-600 px-2 py-0.5 font-mono text-[11px] text-fg-subtle">
                      {faq.displayOrder}
                    </span>
                    <StatusPill tone={faq.isActive ? "active" : "neutral"}>
                      {faq.isActive ? "Published" : "Hidden"}
                    </StatusPill>
                    <span className="text-[11.5px] text-fg-subtle">{faq.category}</span>
                  </div>
                  <form action={deleteFaqAction}>
                    <input type="hidden" name="faqId" value={faq.id} />
                    <button
                      type="submit"
                      className="text-[12.5px] text-fg-subtle transition-colors hover:text-status-rejected"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                <FaqForm
                  compact
                  values={{
                    id: faq.id,
                    question: faq.question,
                    answer: faq.answer,
                    category: faq.category,
                    displayOrder: faq.displayOrder,
                    isActive: faq.isActive,
                  }}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </DashboardPage>
  );
}
