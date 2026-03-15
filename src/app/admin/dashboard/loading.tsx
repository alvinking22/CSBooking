import { SkeletonDashboard } from "@/components/common/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <SkeletonDashboard />
    </div>
  );
}
