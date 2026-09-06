import type { Metadata } from "next";

import { DashboardPage, PageTitle } from "@/components/dashboard/page-parts";
import { Card } from "@/components/ui/card";
import { InfoNote } from "@/components/ui/feedback";
import {
  SettingsGroupForm,
  type SettingFieldModel,
} from "@/components/admin/settings-form";
import {
  SETTING_DEFAULTS,
  SETTING_KEYS,
  SETTING_META,
  getSettings,
  paymentConfigured,
  type SettingKey,
} from "@/lib/settings";
import { WEEKDAY_NAMES } from "@/lib/time";

export const metadata: Metadata = { title: "Settings" };

const GROUPS: { id: string; title: string; description: string }[] = [
  {
    id: "general",
    title: "General",
    description: "Company identity, operating country, timezone and display currency.",
  },
  {
    id: "payments",
    title: "Payments",
    description:
      "The asset, network and company wallet investors pay into. Nothing is shown to investors until both the network and the address are set.",
  },
  {
    id: "investments",
    title: "Investments",
    description:
      "Weekly cycle schedule, term length, rollover rule and the limit on open investments per account.",
  },
  {
    id: "withdrawals",
    title: "Withdrawals",
    description: "Available methods, minimum amount and the password confirmation requirement.",
  },
  {
    id: "kyc",
    title: "Identity verification",
    description: "Accepted documents, minimum age, upload limit and the notice shown to investors.",
  },
  {
    id: "support",
    title: "Support",
    description: "Contact channels shown across the public site and dashboard.",
  },
  { id: "social", title: "Social links", description: "Links shown in the footer." },
  {
    id: "content",
    title: "Homepage content",
    description: "Announcement bar, hero copy and the explainer video URL.",
  },
  {
    id: "legal",
    title: "Legal identity",
    description:
      "Company registration details. Leave blank unless the business actually holds them — the site omits, rather than invents, anything missing.",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Global switches for email and in-app notifications.",
  },
  {
    id: "maintenance",
    title: "Maintenance",
    description: "Close the public site to everyone except staff.",
  },
];

/** Chooses the control for a setting from the shape of its default value. */
function fieldKind(key: SettingKey): SettingFieldModel["kind"] {
  const fallback = SETTING_DEFAULTS[key];

  if (typeof fallback === "boolean") return "boolean";
  if (typeof fallback === "number") return "number";
  if (Array.isArray(fallback)) return "list";
  if (key === "cycle.weekday" || key === "rollover.mode") return "select";

  const longText: SettingKey[] = [
    "company.description",
    "company.regulatoryNotice",
    "content.heroSubheadline",
    "content.announcement",
    "payment.instructions",
    "withdrawal.instructions",
    "kyc.notice",
    "maintenance.message",
  ];
  return longText.includes(key) ? "textarea" : "text";
}

function fieldOptions(key: SettingKey) {
  if (key === "cycle.weekday") {
    return WEEKDAY_NAMES.map((name, index) => ({ value: String(index), label: name }));
  }
  if (key === "rollover.mode") {
    return [
      { value: "SAME_PACKAGE_PERCENTAGE", label: "Keep the matured investment's percentage" },
      { value: "REQUIRE_PACKAGE_SELECTION", label: "Require the investor to choose a package" },
    ];
  }
  return undefined;
}

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const configured = paymentConfigured(settings);

  return (
    <DashboardPage className="max-w-4xl">
      <PageTitle
        title="Settings"
        description="Everything the platform treats as configurable. Changes are audited."
      />

      {!configured ? (
        <InfoNote tone="warning" className="mb-6">
          <strong className="font-semibold">Payments are not configured.</strong> Set the network
          and the company wallet address below. Until both are present, investors cannot create a
          subscription and no wallet details are displayed anywhere.
        </InfoNote>
      ) : null}

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const fields: SettingFieldModel[] = SETTING_KEYS.filter(
            (key) => SETTING_META[key].group === group.id,
          ).map((key) => ({
            key,
            label: SETTING_META[key].label,
            description: SETTING_META[key].description,
            kind: fieldKind(key),
            value: settings[key] as SettingFieldModel["value"],
            options: fieldOptions(key),
          }));

          if (fields.length === 0) return null;

          return (
            <Card key={group.id} className="p-5 sm:p-6">
              <SettingsGroupForm
                group={group.id}
                title={group.title}
                description={group.description}
                fields={fields}
              />
            </Card>
          );
        })}
      </div>

      <InfoNote className="mt-8">
        Changing the cycle weekday or opening time affects future cycles only. Investments that are
        already active keep the maturity instant that was calculated when they were activated.
      </InfoNote>
    </DashboardPage>
  );
}
