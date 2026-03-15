// Next.js auto-wraps this in a Suspense boundary — async-suspense-boundaries
// Shown while any async Server Component in /admin is loading
import { SkeletonDashboard } from "@/components/common/Skeleton";

export default function AdminLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <SkeletonDashboard />
    </div>
  );
}
