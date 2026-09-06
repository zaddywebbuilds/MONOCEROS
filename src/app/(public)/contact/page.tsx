import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHeader } from "@/components/marketing/prose";
import { ContactForm } from "@/components/marketing/contact-form";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import { getPublicSettings } from "@/lib/settings";
import { appUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Monoceros team by email, WhatsApp, or through the contact form.",
  alternates: { canonical: `${appUrl}/contact` },
};

export default async function ContactPage() {
  const settings = await getPublicSettings();

  const details = [
    settings["support.email"] && {
      icon: Mail,
      label: "Email",
      value: settings["support.email"],
      href: `mailto:${settings["support.email"]}`,
    },
    settings["support.whatsapp"] && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings["support.whatsapp"],
      href: `https://wa.me/${settings["support.whatsapp"].replace(/[^\d]/g, "")}`,
    },
    settings["support.phone"] && {
      icon: Phone,
      label: "Phone",
      value: settings["support.phone"],
      href: `tel:${settings["support.phone"].replace(/\s/g, "")}`,
    },
    settings["company.address"] && {
      icon: MapPin,
      label: "Address",
      value: settings["company.address"],
    },
    {
      icon: Clock,
      label: "Support hours",
      value: settings["support.hours"],
    },
  ].filter(Boolean) as {
    icon: typeof Mail;
    label: string;
    value: string;
    href?: string;
  }[];

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="For anything account-specific, sign in and open a support ticket — it keeps a written history against your account. For general enquiries, use the form below."
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14">
          <Card className="p-6 sm:p-8">
            <h2 className="text-lg font-semibold tracking-tight text-fg">Send a message</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
              We reply by email. Please allow one business day.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-6">
              <h2 className="text-[15px] font-semibold text-fg">Contact details</h2>
              <ul className="mt-4 space-y-4">
                {details.map((detail) => (
                  <li key={detail.label} className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-850 text-fg-muted">
                      <detail.icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                        {detail.label}
                      </p>
                      {detail.href ? (
                        <a
                          href={detail.href}
                          target={detail.href.startsWith("http") ? "_blank" : undefined}
                          rel={detail.href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="mt-0.5 block break-words text-[13.5px] text-fg transition-colors hover:text-accent-300"
                        >
                          {detail.value}
                        </a>
                      ) : (
                        <p className="mt-0.5 break-words text-[13.5px] text-fg">{detail.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <InfoNote tone="warning">
              Monoceros staff will never ask for your password, a one-time code, or a wallet
              recovery phrase. Ignore any message that does.
            </InfoNote>
          </div>
        </div>
      </div>
    </>
  );
}
