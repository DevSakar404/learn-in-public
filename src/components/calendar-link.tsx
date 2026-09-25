"use client";

import { CopyIcon, RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { rotateCalendarLink } from "@/app/actions/planner";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CalendarLink({ url }: { url: string }) {
  const [pending, startTransition] = useTransition();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Calendar link copied.");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="calendar-url">Private calendar link</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="calendar-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-xs"
        />
        <Button type="button" variant="outline" onClick={copy}>
          <CopyIcon aria-hidden /> Copy
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">Google Calendar:</strong> Other calendars → + → From
          URL → paste. On a phone it syncs through the same account.
        </li>
        <li>
          <strong className="text-foreground">Apple Calendar:</strong> File → New Calendar
          Subscription → paste, and turn on alerts.
        </li>
        <li>
          Calendars refresh subscriptions every few hours (Google can take up to a day), so schedule
          changes aren&apos;t instant.
        </li>
        <li>
          Anyone with this link can see your schedule (not your content). If it leaks, create a new
          one.
        </li>
      </ul>
      <ConfirmButton
        label="Create new link"
        title="Replace the calendar link?"
        description="The current link stops working immediately. You'll need to subscribe again with the new one."
        confirmLabel="Replace link"
        disabled={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await rotateCalendarLink();
            if (r.error) toast.error(r.error);
            else toast.success(r.message);
          })
        }
      />
      <span className="sr-only">{pending && <RefreshCwIcon aria-label="Replacing link" />}</span>
    </div>
  );
}
