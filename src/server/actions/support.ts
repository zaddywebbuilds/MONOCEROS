"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { nextReference } from "@/lib/references";
import { getSettings } from "@/lib/settings";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requestContext } from "@/lib/request";
import { assertStaff, assertUser } from "@/lib/auth/rbac";
import { notify, notifications, notifyStaff } from "@/lib/notifications";
import { sendAdminAlertEmail, sendSupportReplyEmail } from "@/lib/email";
import { writeAudit, AUDIT_ACTION } from "@/lib/audit";
import {
  contactFormSchema,
  supportReplySchema,
  supportStatusSchema,
  supportTicketSchema,
} from "@/lib/validation/platform";
import {
  errorState,
  isFrameworkError,
  parseForm,
  successState,
  toErrorState,
  type ActionState,
} from "@/server/actions/types";

// ---------------------------------------------------------------------------
// Public contact form
// ---------------------------------------------------------------------------

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(contactFormSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const { ipAddress } = await requestContext();
    enforceRateLimit("contactForm", ipAddress ?? "unknown");

    const settings = await getSettings();
    const to = settings["support.email"];

    if (!to) {
      return errorState(
        "The contact form is not configured yet. Please use the WhatsApp or email details in the footer.",
      );
    }

    await sendAdminAlertEmail(
      to,
      `Website enquiry: ${parsed.data.subject}`,
      `From: ${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
    );

    return successState(
      "Thank you — your message has been sent. The support team will reply by email.",
    );
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function createTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(supportTicketSchema, formData);
  if (!parsed.ok) return parsed.state;

  let ticketId: string;

  try {
    const user = await assertUser();
    enforceRateLimit("supportMessage", user.id);

    ticketId = await prisma.$transaction(async (tx) => {
      const reference = await nextReference("ticket", tx);
      const ticket = await tx.supportTicket.create({
        data: {
          reference,
          userId: user.id,
          subject: parsed.data.subject,
          category: parsed.data.category,
          priority: parsed.data.priority,
          status: "OPEN",
          messages: {
            create: {
              authorId: user.id,
              isStaff: false,
              body: parsed.data.message,
            },
          },
        },
      });

      await notifyStaff(
        {
          title: "New support ticket",
          message: `${reference}: ${parsed.data.subject}`,
          type: "INFO",
          link: "/admin/support",
        },
        tx,
      );

      return ticket.id;
    });
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }

  revalidatePath("/dashboard/support");
  redirect(`/dashboard/support/${ticketId}`);
}

export async function replyTicketAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(supportReplySchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const user = await assertUser();
    enforceRateLimit("supportMessage", user.id);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
      include: { user: true },
    });
    if (!ticket) return errorState("That ticket no longer exists.");

    const staff = ["SUPPORT", "ADMIN", "SUPER_ADMIN"].includes(user.role);
    if (!staff && ticket.userId !== user.id) {
      return errorState("You do not have access to that ticket.");
    }
    if (ticket.status === "CLOSED") {
      return errorState("This ticket is closed. Open a new ticket to continue.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          isStaff: staff,
          body: parsed.data.message,
        },
      });

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: {
          lastReplyAt: new Date(),
          status: staff ? "WAITING_FOR_USER" : "OPEN",
        },
      });

      if (staff) {
        await notify(notifications.supportReply(ticket.userId, ticket.reference), tx);
      } else {
        await notifyStaff(
          {
            title: "Support ticket updated",
            message: `${ticket.reference}: the investor has replied.`,
            type: "INFO",
            link: "/admin/support",
          },
          tx,
        );
      }
    });

    if (staff) {
      await sendSupportReplyEmail(ticket.user.email, {
        reference: ticket.reference,
        subject: ticket.subject,
      });
    }

    revalidatePath(`/dashboard/support/${ticket.id}`);
    revalidatePath(`/admin/support/${ticket.id}`);
    return successState("Your reply has been posted.");
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}

export async function setTicketStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(supportStatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  try {
    const admin = await assertStaff();

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
    });
    if (!ticket) return errorState("That ticket no longer exists.");

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: parsed.data.status,
        closedAt: parsed.data.status === "CLOSED" ? new Date() : null,
      },
    });

    await writeAudit({
      actor: admin,
      action: AUDIT_ACTION.TICKET_STATUS_CHANGED,
      entityType: "SupportTicket",
      entityId: ticket.id,
      oldValue: { status: ticket.status },
      newValue: { status: parsed.data.status },
    });

    revalidatePath(`/admin/support/${ticket.id}`);
    revalidatePath("/admin/support");
    return successState(`Ticket marked ${parsed.data.status.replace(/_/g, " ").toLowerCase()}.`);
  } catch (error) {
    if (isFrameworkError(error)) throw error;
    return toErrorState(error);
  }
}
