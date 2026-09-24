"use client";

import { useActionState } from "react";
import { subscribe } from "@/app/actions/subscribe";
import { FieldError, FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";

export function NewsletterForm() {
  const [state, action] = useActionState(subscribe, initialActionState);
  const emailErrors = state.fieldErrors?.email;

  return (
    <section aria-labelledby="newsletter" className="rounded-xl border bg-muted/30 p-6">
      <h2 id="newsletter" className="text-xl font-semibold">
        Get the notes by email
      </h2>
      <p className="mt-1 text-muted-foreground">
        A weekly round-up of what I learned. No spam, unsubscribe anytime.
      </p>
      {state.ok ? (
        <p role="status" className="mt-4 font-medium">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-4 space-y-2" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Label htmlFor="newsletter-email" className="sr-only">
              Email address
            </Label>
            <Input
              id="newsletter-email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.values?.email}
              key={state.values?.email}
              placeholder="you@example.com"
              required
              aria-invalid={!!emailErrors}
              aria-describedby={emailErrors ? "newsletter-email-error" : undefined}
            />
            {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
            <div aria-hidden className="absolute -left-[9999px]">
              <label htmlFor="newsletter-website">Website</label>
              <input
                id="newsletter-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <SubmitButton pendingText="Subscribing…">Subscribe</SubmitButton>
          </div>
          <FieldError id="newsletter-email-error" errors={emailErrors} />
          {!emailErrors && <FormMessage state={state} />}
        </form>
      )}
    </section>
  );
}
