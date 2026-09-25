"use server";

import { revalidatePath } from "next/cache";
import { plannerScheduleSchema } from "@/domain/planner/planner-settings";
import { fromDomainError, fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";
import { authorize } from "../_lib/auth";

export async function saveSchedule(_: ActionState, formData: FormData): Promise<ActionState> {
  const input = plannerScheduleSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return fromZodError(input.error);
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const saved = await (await container.admin.planner()).updateSchedule(input.data);
  if (!saved.ok) return fromDomainError(saved.error);
  revalidatePath("/admin/planner");
  return {
    ok: true,
    message: "Schedule saved. Subscribed calendars pick it up on their next refresh.",
  };
}

export async function rotateCalendarLink(): Promise<ActionState> {
  const auth = await authorize();
  if (!auth.ok) return fromDomainError(auth.error);

  const rotated = await (await container.admin.planner()).rotateCalendarToken();
  if (!rotated.ok) return fromDomainError(rotated.error);
  revalidatePath("/admin/planner");
  return {
    ok: true,
    message: "New link created. The old one stops working; subscribe again with the new link.",
  };
}
