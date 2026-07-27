import type { ReactNode } from "react";

export function AppShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="np-shell">
      {sidebar}
      <main className="np-main">{children}</main>
    </div>
  );
}
