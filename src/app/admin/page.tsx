import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { container } from "@/lib/container";
import { requireAdminPage } from "../_lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();
  const stats = await (await container.admin.dashboard()).stats();

  const tiles = [
    {
      label: "Current streak",
      value: stats.streak,
      hint: stats.streak === 1 ? "day" : "days in a row",
    },
    { label: "Notes published", value: stats.notesPublished, hint: "on the blog" },
    { label: "Drafts pending", value: stats.draftsPending, hint: "draft or approved, not posted" },
    { label: "Posts published", value: stats.postsPosted, hint: "marked as posted" },
    { label: "Subscribers", value: stats.subscribers, hint: "active" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        actions={
          <Button asChild>
            <Link href="/admin/notes/new">
              <PlusIcon aria-hidden /> New note
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {tiles.map((t, i) => (
          <Card key={t.label} className={cn(i === 0 && "col-span-2 lg:col-span-1")}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
                {t.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">{t.hint}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
