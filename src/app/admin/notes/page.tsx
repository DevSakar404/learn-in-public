import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { NOTE_STATUSES, type NoteStatus } from "@/domain/note/note";
import { container } from "@/lib/container";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: PageProps<"/admin/notes">) {
  await requireAdminPage();
  const params = await searchParams;
  const status = NOTE_STATUSES.find((s) => s === params.status) as NoteStatus | undefined;
  const topics = await (await container.admin.topics()).list();
  const topicId = topics.find((t) => t.id === params.topic)?.id;
  const notes = await (await container.admin.notes()).list({ status, topicId });
  const { timeZone } = container.config();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        actions={
          <Button asChild>
            <Link href="/admin/notes/new">
              <PlusIcon aria-hidden /> New note
            </Link>
          </Button>
        }
      />

      <form
        className="grid grid-cols-2 items-end gap-3 sm:flex"
        role="search"
        aria-label="Filter notes"
      >
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={status ?? ""} className="sm:w-40">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="topic">Topic</Label>
          <NativeSelect id="topic" name="topic" defaultValue={topicId ?? ""} className="sm:w-52">
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary" className="col-span-2 sm:col-span-1">
          Filter
        </Button>
      </form>

      {notes.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="hidden sm:table-cell">Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="py-3 whitespace-normal">
                  <Link
                    href={`/admin/notes/${n.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {n.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                    {n.topic.name} · {formatDate(n.publishedAt ?? n.createdAt, timeZone)}
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{n.topic.name}</TableCell>
                <TableCell className="align-top sm:align-middle">
                  <Badge variant={n.status === "published" ? "default" : "outline"}>
                    {n.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {formatDate(n.publishedAt ?? n.createdAt, timeZone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">
          {status || topicId
            ? "No notes match these filters."
            : "No notes yet. Write your first one!"}
        </p>
      )}
    </div>
  );
}
