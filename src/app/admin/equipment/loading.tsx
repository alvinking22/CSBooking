import { SkeletonCard, Skeleton } from "@/components/common/Skeleton";

export default function EquipmentLoading() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      {[1, 2].map((i) => (
        <SkeletonCard key={i} lines={4} />
      ))}
    </div>
  );
}
