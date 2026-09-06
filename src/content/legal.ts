import type { SettingsMap } from "@/lib/settings";

/**
 * Default legal and policy copy.
 *
 * These are working documents an administrator can replace wholesale from
 * Admin -> Website Content. Deliberately absent: licence numbers, regulator
 * names, audited figures and certifications. Where the business has not
 * supplied a value (registration number, registered address), the sentence is
 * omitted rather than filled with an invented one.
 */

export type LegalSlug = "privacy" | "terms" | "risk-disclosure" | "aml-kyc";

export interface LegalDocument {
  slug: LegalSlug;
  title: string;
  summary: string;
  body: string;
}

function companyLine(settings: SettingsMap): string {
  const name = settings["company.legalName"] || settings["company.name"];
  const parts = [name];
  if (settings["company.registrationNumber"]) {
    parts.push(`(registration number ${settings["company.registrationNumber"]})`);
  }
  if (settings["company.address"]) {
    parts.push(`of ${settings["company.address"]}`);
  }
  return parts.join(" ");
}

export function legalDocuments(settings: SettingsMap): Record<LegalSlug, LegalDocument> {
  const company = settings["company.name"];
  const operator = companyLine(settings);
  const email = settings["support.email"];
  const country = settings["general.country"];

  return {
    privacy: {
      slug: "privacy",
      title: "Privacy Policy",
      summary: `How ${company} collects, uses, stores and protects your personal information.`,
      body: `This Privacy Policy explains how ${operator} ("we", "us") handles personal information collected through this platform. It applies to everyone who registers for, or uses, a ${company} account.

## Information we collect

- Identity details you provide at registration: first name, surname, other names, date of birth and country of residence.
- Contact details: email address and mobile number.
- Verification information: your National Identification Number (NIN), the identity document type and number you select, and the document image or PDF you upload.
- Financial activity records: the packages you subscribe to, the amounts recorded against those subscriptions, the transaction hashes you submit, and the withdrawal destinations you nominate.
- Technical information: IP address, browser user agent, session activity and login events. We record these to protect your account and to investigate suspicious activity.

We do not collect payment card details, private keys or wallet seed phrases, and we will never ask you for them.

## How we use your information

- To create and administer your account.
- To verify your identity and meet anti-money-laundering obligations.
- To process and verify subscription payments, and to administer investment cycles, maturity, withdrawals and rollovers.
- To notify you about activity on your account by email and in your dashboard.
- To detect, investigate and prevent fraud, abuse and unauthorised access.
- To comply with legal and regulatory requirements applicable in ${country}.

## Identity documents

Identity documents are stored in private storage that is not publicly accessible and is not served as a static file. They are retrievable only by authorised compliance staff, through short-lived links that expire, and every access is written to an audit log.

## Sharing

We do not sell personal information. We share it only with service providers that operate the platform on our behalf (for example our database, storage and email providers), and where we are required to do so by law or by a competent authority.

## Retention

We retain account, verification and transaction records for as long as your account is open and afterwards for the period required by applicable law and by our anti-money-laundering obligations.

## Your rights

You may request access to the personal information we hold about you, ask us to correct inaccurate information, or ask about deletion. Some information cannot be deleted while a legal retention obligation applies. Contact ${email} to make a request.

## Security

We hash passwords, issue session cookies that are HttpOnly and same-site restricted, rate-limit authentication attempts, validate every upload, and check authorisation on the server for every protected action. No system can be guaranteed impenetrable; please use a unique password and tell us immediately if you suspect unauthorised access.

## Changes

We may update this policy. The current version is always published on this page. Material changes will be communicated by email or by a notice in your dashboard.

## Contact

Questions about this policy can be sent to ${email}.`,
    },

    terms: {
      slug: "terms",
      title: "Terms & Conditions",
      summary: `The agreement between you and ${company} when you open an account and subscribe to an investment package.`,
      body: `These Terms govern your use of the ${company} platform operated by ${operator}. By creating an account you agree to them.

## Eligibility

- You must be at least 18 years old.
- You must be resident in ${country} and able to complete identity verification.
- You must register in your own name. Accounts opened on behalf of another person are not permitted.
- One account per person. We may suspend duplicate accounts.

## Your account

You are responsible for keeping your password confidential and for all activity carried out under your account. Notify us immediately at ${email} if you believe your account has been compromised. We may suspend an account where we identify a security concern, suspected fraud, or a breach of these Terms.

## Identity verification

Access to investment features requires approved identity verification. We review submissions manually and may decline a submission or request a clearer document. We may re-request verification at any time where regulation or risk assessment requires it.

## Investment packages

- Each package states its capital, return percentage, term length and maturity value.
- When you subscribe, those values are copied onto your investment record and do not change afterwards, even if the package is subsequently edited.
- The maturity value shown is determined by the package. It is not a forecast of, and does not vary with, the results of any external trading activity.

## Payments

- Subscription payments are made in the digital asset and on the network displayed on the payment page.
- You must send the exact amount displayed and submit the transaction hash for that transfer.
- A transaction hash may be submitted once only, across the whole platform.
- Payments are verified manually. Verification is not automatic and is not instant.
- Sending a different asset, or using a different network from the one displayed, may result in permanent and irrecoverable loss. That risk is yours.

## Investment cycles and maturity

- A new investment cycle opens weekly, on the day and at the time published on this website.
- A subscription whose payment is approved before a cycle opens joins that cycle. A subscription approved at or after that moment joins the following cycle.
- The term begins when the cycle opens and runs for the number of days stated on your investment record.
- Maturity is calculated from stored timestamps on our servers, not from your device clock.

## Withdrawals and rollovers

- Withdrawal and rollover become available only once an investment has matured.
- Withdrawals are reviewed and settled manually. You must supply a correct destination address and network; transfers cannot be reversed.
- A rollover carries the full matured amount into a new subscription, which joins the next available cycle.

## Prohibited use

You must not use the platform to launder money, to finance illegal activity, to impersonate another person, to submit forged documents, or to attempt to circumvent security controls.

## No advice

Nothing on this platform is investment, tax or legal advice. You are responsible for deciding whether a subscription is suitable for you, and for any tax arising from it.

## Limitation

To the maximum extent permitted by law, we are not liable for indirect or consequential loss. Nothing in these Terms limits liability that cannot lawfully be limited.

## Suspension and closure

We may suspend or close an account for breach of these Terms, for suspected fraud, or where required by law. Where funds are held against an open subscription at that time, we will deal with them in accordance with applicable law.

## Changes

We may amend these Terms. The current version is always published here, and material changes will be notified to you.

## Governing law

These Terms are governed by the laws of ${country}.`,
    },

    "risk-disclosure": {
      slug: "risk-disclosure",
      title: "Risk Disclosure",
      summary:
        "The principal risks of subscribing to an investment package on this platform. Read this before you subscribe.",
      body: `Investing involves risk. This disclosure describes the principal risks of using the ${company} platform. It is not exhaustive.

## Capital is at risk

You may lose some or all of the money you commit. Do not commit money you cannot afford to lose, and do not borrow to invest.

## Maturity values are contractual, not guaranteed outcomes

The maturity value shown against a package is a figure defined by that package and recorded on your investment. It is not a prediction of market performance, and it is not a guarantee that funds will be available for settlement. Settlement depends on the operator's ability to meet its obligations.

## Counterparty and operational risk

Trading is carried out by an externally operated automated system that this platform does not control, connect to, or monitor. Losses, failures, suspension or discontinuation of that external operation may affect the operator's ability to settle maturity amounts or withdrawals.

## Digital asset risk

- Subscription payments and withdrawals use digital assets. Blockchain transfers are irreversible.
- Sending the wrong asset, or using the wrong network, will normally result in permanent loss.
- Digital asset prices, custody arrangements and network availability can change quickly.

## Liquidity and timing risk

- Funds are committed for the full term of the investment. There is no early exit, no partial withdrawal and no secondary market.
- Subscriptions do not start immediately: they wait for the next weekly cycle.
- Payment verification and withdrawal settlement are performed manually and may take time.

## Regulatory risk

Rules applying to digital assets and to investment arrangements in ${country} may change, and such changes may affect this platform, your subscription, or your ability to withdraw.

## Technology and security risk

Online platforms can be affected by outages, defects and attacks. We apply security controls, but no system is immune. Protect your password and your withdrawal wallet details.

## No advice and no guarantees

We do not provide investment advice or personal recommendations. We publish no performance statistics, testimonials or success claims. If you need advice, consult an appropriately licensed professional.

## Questions

If any part of this disclosure is unclear, contact ${email} before subscribing.`,
    },

    "aml-kyc": {
      slug: "aml-kyc",
      title: "AML / KYC Policy",
      summary: `How ${company} verifies customers and monitors activity to prevent money laundering and financial crime.`,
      body: `${operator} operates customer due diligence and monitoring controls designed to prevent the platform being used for money laundering, terrorist financing or other financial crime.

## Customer due diligence

Before an account can subscribe to an investment package we collect and verify:

- Full legal name, date of birth and country of residence.
- A verified email address and a mobile number.
- The National Identification Number (NIN).
- A supported government-issued identity document, uploaded as an image or PDF.

Every submission is reviewed by a member of staff. We may approve it, decline it, or request a clearer or additional document. We record the reviewer and the time of every decision.

## Acceptable documents

The document types accepted at any time are configured by the compliance team and shown on the verification page. The document must be current, legible, unaltered, and must match the name on the account.

## Ongoing monitoring

- Payment submissions are matched against the expected subscription amount.
- A blockchain transaction hash can be registered only once across the platform; duplicate submissions are rejected.
- Withdrawal destinations are recorded, and changes to a saved withdrawal wallet are logged and notified to the account holder by email.
- Login events, including failures, are recorded, and repeated failures temporarily lock the account.

## Restrictions

We do not accept anonymous accounts, accounts opened under a false name, or accounts operated on behalf of an undisclosed third party. We may decline, suspend or close an account, and may decline a withdrawal to a destination we cannot reasonably associate with the account holder, where we have concerns.

## Record keeping

Verification records, payment records, investment records and audit logs are retained for the period required by applicable law. Audit records of administrative decisions cannot be deleted through the administration interface.

## Reporting

Where we are required to report suspicious activity to a competent authority, we will do so in accordance with the law, and we may be prohibited from informing you that a report has been made.

## Contact

Compliance queries can be sent to ${email}.`,
    },
  };
}
