import { LoadingRegion, PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";

export default function SubscribersLoading() {
  return (
    <LoadingRegion label="Loading subscribers" className="space-y-6">
      <PageHeaderSkeleton actions={1} />
      <TableSkeleton rows={5} columns={3} />
    </LoadingRegion>
  );
}
