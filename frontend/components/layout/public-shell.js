import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
export function PublicShell({ children }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
