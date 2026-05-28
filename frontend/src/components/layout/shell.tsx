import { Header } from "./header";
import { Footer } from "./footer";

interface ShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function Shell({ children, showHeader = true, showFooter = true }: ShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header />}
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
