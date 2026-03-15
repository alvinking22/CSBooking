import { SkeletonTable, Skeleton } from "@/components/common/Skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <SkeletonTable rows={6} cols={4} />
    </div>
  );
}
