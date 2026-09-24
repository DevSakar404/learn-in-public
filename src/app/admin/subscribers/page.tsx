import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Subscribers" };

export default async function SubscribersPage() {
  await requireAdminPage();
  const subscribers = await (await container.admin.subscribers()).list();
  const active = subscribers.filter((s) => s.status === "active").length;
  const { timeZone } = container.config();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Subscribers</h1>
          <p className="text-muted-foreground">
            {active} active {active === 1 ? "subscriber" : "subscribers"} ({subscribers.length}{" "}
            total)
          </p>
        </div>
        {/* A plain link: the route handler streams a CSV download. */}
        <Button variant="outline" asChild>
          <a href="/admin/subscribers/export" download>
            Export CSV
          </a>
        </Button>
      </div>
      {subscribers.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscribed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.email}</TableCell>
                <TableCell>
                  <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(s.createdAt, timeZone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">No subscribers yet.</p>
      )}
    </div>
  );
}
