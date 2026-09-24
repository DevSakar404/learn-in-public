"use client";

import { Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & { pendingText?: string };

/** Disabled with a spinner while its form's action is running. */
export function SubmitButton({ children, pendingText, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Loader2Icon className="size-4 animate-spin" aria-hidden />}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
