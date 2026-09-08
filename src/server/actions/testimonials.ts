"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertStaff } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

const testimonialSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  location: z.string().max(80).optional(),
  content: z.string().min(10, "Testimonial must be at least 10 characters").max(1000),
  receiptImageUrl: z.string().url("Enter a valid image URL").or(z.literal("")).optional(),
  published: z.union([z.literal("on"), z.literal("true"), z.boolean()]).transform(Boolean).optional(),
  featured: z.union([z.literal("on"), z.literal("true"), z.boolean()]).transform(Boolean).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export async function createTestimonialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(testimonialSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await assertStaff();
    const { receiptImageUrl, ...rest } = parsed.data;
    await prisma.testimonial.create({
      data: {
        ...rest,
        published: rest.published ?? false,
        featured: rest.featured ?? false,
        receiptImageUrl: receiptImageUrl || null,
      },
    });
    revalidatePath("/admin/testimonials");
    revalidatePath("/testimonials");
    revalidatePath("/");
    return successState("Testimonial added.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function updateTestimonialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("id")?.toString();
  if (!id) return errorState("Missing testimonial ID.");

  const parsed = parseForm(testimonialSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    await assertStaff();
    const { receiptImageUrl, ...rest } = parsed.data;
    await prisma.testimonial.update({
      where: { id },
      data: {
        ...rest,
        published: rest.published ?? false,
        featured: rest.featured ?? false,
        receiptImageUrl: receiptImageUrl || null,
      },
    });
    revalidatePath("/admin/testimonials");
    revalidatePath("/testimonials");
    revalidatePath("/");
    return successState("Testimonial updated.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionState> {
  try {
    await assertStaff();
    await prisma.testimonial.delete({ where: { id } });
    revalidatePath("/admin/testimonials");
    revalidatePath("/testimonials");
    revalidatePath("/");
    return successState("Testimonial deleted.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function togglePublishedAction(id: string, published: boolean): Promise<ActionState> {
  try {
    await assertStaff();
    await prisma.testimonial.update({ where: { id }, data: { published } });
    revalidatePath("/admin/testimonials");
    revalidatePath("/testimonials");
    revalidatePath("/");
    return successState(published ? "Published." : "Unpublished.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}
