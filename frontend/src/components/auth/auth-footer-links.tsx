import Link from "next/link";
import { cn } from "@/lib/utils";

interface AuthFooterLink {
  label: string;
  href: string;
}

interface AuthFooterLinksProps {
  links: AuthFooterLink[];
  className?: string;
}

export function AuthFooterLinks({ links, className }: AuthFooterLinksProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm", className)}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
