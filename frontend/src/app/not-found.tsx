import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center space-y-6 max-w-md text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            To be developed
          </h1>
          <p className="text-muted-foreground text-lg">
            This page is not yet available. We&apos;re working on it.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
