import { TopicManager } from "@/components/topic-manager";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Topics" };

export default async function TopicsPage() {
  await requireAdminPage();
  const topics = await (await container.admin.topics()).list();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Topics</h1>
      <TopicManager topics={topics} />
    </div>
  );
}
