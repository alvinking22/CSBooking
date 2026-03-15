import { SkeletonTable } from "@/components/common/Skeleton";
import { Skeleton } from "@/components/common/Skeleton";

export default function BookingsLoading() {
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <SkeletonTable rows={8} cols={6} />
    </div>
  );
}
