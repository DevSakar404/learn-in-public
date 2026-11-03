import { DownloadIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title="Subscribers"
        description={`${active} active ${active === 1 ? "subscriber" : "subscribers"} (${subscribers.length} total)`}
        actions={
          // A plain link: the route handler streams a CSV download.
          <Button variant="outline" asChild>
            <a href="/admin/subscribers/export" download>
              <DownloadIcon aria-hidden /> Export CSV
            </a>
          </Button>
        }
      />
      {subscribers.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Subscribed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="py-3 break-all whitespace-normal">
                  {s.email}
                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                    {formatDate(s.createdAt, timeZone)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
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
