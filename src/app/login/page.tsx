import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </main>
  );
}
