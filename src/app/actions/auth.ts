"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fromZodError, type ActionState } from "@/lib/action-state";
import { container } from "@/lib/container";

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

/** Only same-site admin paths, so `?next=` can't be used as an open redirect. */
const safeNext = (next?: string) => (next && /^\/admin(\/|$)/.test(next) ? next : "/admin");

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const input = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!input.success) return { ...fromZodError(input.error), values };

  const signedIn = await (await container.auth()).signIn(input.data.email, input.data.password);
  if (!signedIn.ok) return { error: signedIn.error.message, values };
  redirect(safeNext(input.data.next));
}

export async function logout(): Promise<void> {
  await (await container.auth()).signOut();
  redirect("/login");
}
