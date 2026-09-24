import { container } from "@/lib/container";
import { authorize } from "../../../_lib/auth";

export async function GET() {
  const auth = await authorize();
  if (!auth.ok) return new Response("Unauthorized", { status: 401 });

  const csv = await (await container.admin.subscribers()).exportCsv();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
