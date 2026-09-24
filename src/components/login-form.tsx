"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { FieldError, FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1>Admin login</h1>
        </CardTitle>
        <CardDescription>Sign in to write notes and review drafts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          {next && <input type="hidden" name="next" value={next} />}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              defaultValue={state.values?.email}
              key={state.values?.email}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <FieldError id="email-error" errors={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <FieldError id="password-error" errors={errors.password} />
          </div>
          <FormMessage state={state} />
          <SubmitButton className="w-full" pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
