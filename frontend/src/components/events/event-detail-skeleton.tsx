import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function EventDetailSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      <div className="mb-6 space-y-4">
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />

          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-2/3" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-20">
            <div className="space-y-6">
              <Skeleton className="h-7 w-32" />

              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>

              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-4 w-full mx-auto" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
