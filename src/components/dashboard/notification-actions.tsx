"use client";

import * as React from "react";
import { CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { markAllNotificationsReadAction } from "@/server/actions/account";

export function MarkAllReadButton() {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsReadAction();
          toast({
            title: result.status === "success" ? "Notifications" : "Could not update",
            description: result.message ?? undefined,
            tone: result.status === "success" ? "success" : "error",
          });
        })
      }
    >
      <CheckCheck />
      {pending ? "Working…" : "Mark all as read"}
    </Button>
  );
}
