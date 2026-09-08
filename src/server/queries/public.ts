import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { getPublicSettings } from "@/lib/settings";
import { nextCycleStart, type CycleConfig, type Weekday, BUSINESS_TIMEZONE } from "@/lib/time";

/**
 * Read models for the public marketing site.
 *
 * Each getter degrades gracefully: a database hiccup renders an explicit empty
 * or unavailable state rather than a 500, and never renders invented content.
 */

export interface PublicPackage {
  id: string;
  name: string;
  slug: string;
  minimumCapital: string;
  returnPercentage: string;
  maturityAmount: string;
  durationDays: number;
  description: string;
  badge: string | null;
}

export const getPublicPackages = cache(async (): Promise<PublicPackage[]> => {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { minimumCapital: "asc" }],
    });

    return packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug,
      minimumCapital: pkg.minimumCapital.toFixed(2),
      returnPercentage: pkg.returnPercentage.toDecimalPlaces(2).toString(),
      maturityAmount: pkg.maturityAmount.toFixed(2),
      durationDays: pkg.durationDays,
      description: pkg.description,
      badge: pkg.badge,
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[public] package query failed:", error);
    return [];
  }
});

export interface PublicFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const getPublicFaqs = cache(async (): Promise<PublicFaq[]> => {
  try {
    const faqs = await prisma.faq.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
    }));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[public] faq query failed:", error);
    return [];
  }
});

export interface PublicTestimonial {
  id: string;
  name: string;
  location: string | null;
  content: string;
  receiptImageUrl: string | null;
  featured: boolean;
}

export const getPublicTestimonials = cache(async (): Promise<PublicTestimonial[]> => {
  try {
    return await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, location: true, content: true, receiptImageUrl: true, featured: true },
    });
  } catch {
    return [];
  }
});

export const getContentBlock = cache(async (slug: string) => {
  try {
    return await prisma.contentBlock.findFirst({ where: { slug, isActive: true } });
  } catch {
    return null;
  }
});

/** Cycle configuration derived from settings, with safe defaults. */
export const getPublicCycleConfig = cache(async (): Promise<CycleConfig> => {
  const settings = await getPublicSettings();
  return {
    weekday: settings["cycle.weekday"] as Weekday,
    time: settings["cycle.time"],
    timeZone: settings["general.timezone"] || BUSINESS_TIMEZONE,
  };
});

/** Next cycle boundary — pure arithmetic, so it works with or without a database. */
export async function getNextCycleStart(now: Date = new Date()): Promise<Date> {
  return nextCycleStart(now, await getPublicCycleConfig());
}
