import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <Card
      className={cn(
        "w-full max-w-[420px] border-0 shadow-2xl shadow-black/5",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      <CardHeader className="space-y-1 px-8 pt-8 pb-6">
        <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
        {description && (
          <CardDescription className="text-base text-muted-foreground">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-8 pb-6">{children}</CardContent>
      {footer && <CardFooter className="px-8 pb-8 pt-0">{footer}</CardFooter>}
    </Card>
  );
}
