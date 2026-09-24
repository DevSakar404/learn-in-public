import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader>
              <CardDescription>{t.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{t.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{t.hint}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
