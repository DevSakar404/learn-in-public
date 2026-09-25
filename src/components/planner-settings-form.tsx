"use client";

import { useActionState } from "react";
import { saveSchedule } from "@/app/actions/planner";
import { FieldError, FormMessage } from "@/components/form-message";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/components/use-action-toast";
import { WEEKDAYS, type PlannerSchedule } from "@/domain/planner/planner-settings";
import { initialActionState } from "@/lib/action-state";

const REMINDERS = [
  [0, "At the time"],
  [15, "15 minutes before"],
  [30, "30 minutes before"],
  [60, "1 hour before"],
  [120, "2 hours before"],
] as const;

export function PlannerSettingsForm({
  schedule,
  timeZone,
}: {
  schedule: PlannerSchedule;
  timeZone: string;
}) {
  const [state, action] = useActionState(saveSchedule, initialActionState);
  useActionToast(state);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="dailyTime">Daily publishing time ({timeZone})</Label>
        <Input
          id="dailyTime"
          name="dailyTime"
          type="time"
          defaultValue={schedule.dailyTime}
          required
          aria-invalid={!!errors.dailyTime}
        />
        <FieldError id="dailyTime-error" errors={errors.dailyTime} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="youtubeWeekday">Weekly YouTube day</Label>
        <NativeSelect
          id="youtubeWeekday"
          name="youtubeWeekday"
          defaultValue={schedule.youtubeWeekday}
        >
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reminderMinutes">Calendar reminder</Label>
        <NativeSelect
          id="reminderMinutes"
          name="reminderMinutes"
          defaultValue={schedule.reminderMinutes}
        >
          {REMINDERS.map(([m, label]) => (
            <option key={m} value={m}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="journeyStart">Journey start (Day 1)</Label>
        <Input
          id="journeyStart"
          name="journeyStart"
          type="date"
          defaultValue={schedule.journeyStart}
          required
          aria-invalid={!!errors.journeyStart}
        />
        <FieldError id="journeyStart-error" errors={errors.journeyStart} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton pendingText="Saving…">Save schedule</SubmitButton>
        {state.fieldErrors && <FormMessage state={state} />}
      </div>
    </form>
  );
}
