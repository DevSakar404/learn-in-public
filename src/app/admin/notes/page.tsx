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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Notes</h1>
        <Button asChild>
          <Link href="/admin/notes/new">New note</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter notes">
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <NativeSelect id="status" name="status" defaultValue={status ?? ""} className="w-40">
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="topic">Topic</Label>
          <NativeSelect id="topic" name="topic" defaultValue={topicId ?? ""} className="w-52">
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {notes.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/notes/${n.id}`} className="hover:underline">
                    {n.title}
                  </Link>
                </TableCell>
                <TableCell>{n.topic.name}</TableCell>
                <TableCell>
                  <Badge variant={n.status === "published" ? "default" : "outline"}>
                    {n.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
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
