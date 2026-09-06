import type { TicketPriority, TicketStatus, TicketCategory } from "@prisma/client";

import type { StatusTone } from "@/lib/domain/investment-status";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_USER: "Awaiting reply",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_STATUS_TONE: Record<TicketStatus, StatusTone> = {
  OPEN: "pending",
  IN_PROGRESS: "pending",
  WAITING_FOR_USER: "matured",
  RESOLVED: "active",
  CLOSED: "neutral",
};

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  GENERAL: "General",
  ACCOUNT: "My account",
  KYC: "Identity verification",
  PAYMENT: "Payments",
  WITHDRAWAL: "Withdrawals",
  TECHNICAL: "Technical problem",
  OTHER: "Something else",
};
