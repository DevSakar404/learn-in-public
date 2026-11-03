import { PageHeader } from "@/components/page-header";
import { TopicManager } from "@/components/topic-manager";
import { container } from "@/lib/container";
import { requireAdminPage } from "../../_lib/auth";

export const metadata = { title: "Topics" };

export default async function TopicsPage() {
  await requireAdminPage();
  const topics = await (await container.admin.topics()).list();
  return (
    <div className="space-y-8">
      <PageHeader title="Topics" description="Every note belongs to one topic." />
      <TopicManager topics={topics} />
    </div>
  );
}
