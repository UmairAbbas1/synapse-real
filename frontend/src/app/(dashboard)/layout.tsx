import type { ReactNode } from "react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="hidden w-56 shrink-0 border-r border-neutral-800 p-4 md:block">
        <nav className="flex flex-col gap-2 text-sm">
          <Link className="hover:text-cyan-400" href="/chat">
            Chat
          </Link>
          <Link className="hover:text-cyan-400" href="/history">
            History
          </Link>
          <Link className="hover:text-cyan-400" href="/admin">
            Admin
          </Link>
          <Link className="hover:text-cyan-400" href="/settings">
            Settings
          </Link>
        </nav>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">{children}</div>
    </div>
  );
}
