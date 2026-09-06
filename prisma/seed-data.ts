/**
 * Seed content.
 *
 * Kept separate from the seed script so the same definitions can be asserted
 * in tests without running a database import.
 */

export interface SeedPackage {
  name: string;
  slug: string;
  minimumCapital: string;
  returnPercentage: string;
  maturityAmount: string;
  durationDays: number;
  description: string;
  badge: string | null;
  displayOrder: number;
}

/**
 * The five launch packages. `maturityAmount` is stated explicitly and is also
 * asserted against `capital * (1 + return/100)` by the seed script, so a typo
 * cannot reach the database.
 */
export const SEED_PACKAGES: SeedPackage[] = [
  {
    name: "Gold",
    slug: "gold",
    minimumCapital: "500.00",
    returnPercentage: "30",
    maturityAmount: "650.00",
    durationDays: 30,
    description:
      "An entry subscription for investors starting out, with the same structure and records as every other tier.",
    badge: null,
    displayOrder: 1,
  },
  {
    name: "Diamond",
    slug: "diamond",
    minimumCapital: "1000.00",
    returnPercentage: "40",
    maturityAmount: "1400.00",
    durationDays: 30,
    description:
      "A step up in capital for investors who want a larger position in a single 30-day cycle.",
    badge: null,
    displayOrder: 2,
  },
  {
    name: "Sapphire",
    slug: "sapphire",
    minimumCapital: "3000.00",
    returnPercentage: "50",
    maturityAmount: "4500.00",
    durationDays: 30,
    description:
      "A mid-tier subscription balancing committed capital against the term length.",
    badge: "Popular",
    displayOrder: 3,
  },
  {
    name: "Emerald",
    slug: "emerald",
    minimumCapital: "5000.00",
    returnPercentage: "60",
    maturityAmount: "8000.00",
    durationDays: 30,
    description:
      "A substantial subscription for investors comfortable committing capital for a full cycle.",
    badge: null,
    displayOrder: 4,
  },
  {
    name: "Alexandrite",
    slug: "alexandrite",
    minimumCapital: "10000.00",
    returnPercentage: "70",
    maturityAmount: "17000.00",
    durationDays: 30,
    description:
      "The largest subscription tier, with the same manual verification and settlement process as every other package.",
    badge: "Highest tier",
    displayOrder: 5,
  },
];

export interface SeedFaq {
  question: string;
  answer: string;
  category: string;
  displayOrder: number;
}

export const SEED_FAQS: SeedFaq[] = [
  {
    question: "What is Monoceros?",
    answer:
      "Monoceros is an investment subscription management platform. It handles accounts, identity verification, subscriptions, payments, weekly investment cycles, maturity, withdrawals and rollovers. The trading itself is carried out by an externally operated automated system that this website does not connect to or control.",
    category: "General",
    displayOrder: 1,
  },
  {
    question: "How do investment packages work?",
    answer:
      "Each package states the capital required, a return percentage, the maturity value and the term length. When you subscribe, those exact figures are copied onto your investment record. If an administrator later edits the package, your investment is unaffected.",
    category: "Investing",
    displayOrder: 2,
  },
  {
    question: "When does my investment begin?",
    answer:
      "Not when you pay. Your subscription becomes active when the next weekly investment cycle opens, provided your payment has been verified before that moment. Until then your dashboard shows the subscription as queued.",
    category: "Cycles",
    displayOrder: 3,
  },
  {
    question: "Why do new cycles begin on Friday?",
    answer:
      "Investments are grouped into weekly cycles so every subscription in a cycle starts and matures on the same schedule. A cycle opens every Friday at 00:00 West Africa Time. A payment approved before that instant joins that cycle; one approved at or after it waits for the following Friday.",
    category: "Cycles",
    displayOrder: 4,
  },
  {
    question: "How long does a cycle last?",
    answer:
      "Your investment term runs for 30 calendar days from the moment the cycle opens. The countdown in your dashboard is calculated from stored server timestamps, so restarts, outages or a wrong clock on your device cannot change your maturity date.",
    category: "Cycles",
    displayOrder: 5,
  },
  {
    question: "How do I make payment?",
    answer:
      "After choosing a package you are shown the company wallet address, the network and the exact amount, along with a QR code. Send only the displayed asset on the displayed network, then submit the transaction hash from your wallet.",
    category: "Payments",
    displayOrder: 6,
  },
  {
    question: "How is my payment verified?",
    answer:
      "Manually, by a member of the finance team. There is no automatic blockchain check. You are notified by email and in your dashboard as soon as a decision is made. If a payment cannot be verified you are told why and can correct and resubmit the details.",
    category: "Payments",
    displayOrder: 7,
  },
  {
    question: "How do withdrawals work?",
    answer:
      "Once an investment reaches maturity you can request a withdrawal of the full matured amount to a wallet address you nominate. Requests are reviewed and settled manually. You will be asked to confirm your password, and if you change your saved wallet we email you about it.",
    category: "Withdrawals",
    displayOrder: 8,
  },
  {
    question: "Can I roll over my investment?",
    answer:
      "Yes, at maturity. A rollover carries the full matured amount forward as the capital of a new subscription — so a Gold investment maturing at $650 rolls over with $650 of capital, not $500. The new subscription joins the next weekly cycle rather than starting immediately.",
    category: "Investing",
    displayOrder: 9,
  },
  {
    question: "What identification is required?",
    answer:
      "Your National Identification Number (NIN) and a supported identity document: a NIN slip, National ID card, international passport, driver's licence or voter's card. Documents are stored privately, reviewed by a person, and every access to them is logged.",
    category: "Verification",
    displayOrder: 10,
  },
  {
    question: "Can I subscribe to multiple packages?",
    answer:
      "Yes. You can hold several investments at once, and you can subscribe again while an existing investment is still running. Each one is tracked separately with its own reference, dates and maturity value.",
    category: "Investing",
    displayOrder: 11,
  },
  {
    question: "How do I contact support?",
    answer:
      "Open a support ticket from your dashboard for anything account-specific — it keeps a written record against your account. You can also reach the team on WhatsApp or by email using the details in the site footer.",
    category: "Support",
    displayOrder: 12,
  },
  {
    question: "Is my capital at risk?",
    answer:
      "Yes. Investing carries risk, including the risk of losing capital. The maturity value shown against a package is a figure defined by that package; it is not a guarantee that funds will be available, and it is not a forecast of market performance. Read the Risk Disclosure before subscribing.",
    category: "General",
    displayOrder: 13,
  },
];
