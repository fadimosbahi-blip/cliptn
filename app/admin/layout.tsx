
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navigation = [
  {
    label: "Overview",
    href: "/admin",
    icon: "◈",
  },
  {
    label: "Verifications",
    href: "/admin/verifications",
    icon: "✓",
  },
  {
    label: "Campaigns",
    href: "/admin/campaigns",
    icon: "▣",
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "♙",
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "⚑",
  },
];

function AdminLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#08080d] text-white">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#0c0b13]/95 px-5 backdrop-blur-xl lg:hidden">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/30 bg-violet-500/10 text-lg text-violet-300">
            ◈
          </div>
          <div>
            <p className="text-sm font-bold tracking-wide">ClipTN</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              Admin Center
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl text-gray-300"
        >
          {mobileOpen ? "×" : "☰"}
        </button>
      </header>

      {/* Mobile navigation backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/[0.07] bg-[#0d0b15] transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/20 to-blue-500/10 text-xl text-violet-300 shadow-[0_0_25px_rgba(139,92,246,0.12)]">
            ◈
          </div>

          <div>
            <p className="text-base font-bold tracking-wide">ClipTN</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-violet-400">
              Admin Control Center
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto text-xl text-gray-500 hover:text-white lg:hidden"
          >
            ×
          </button>
        </div>

        <div className="px-5 pt-7">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "border border-violet-500/20 bg-violet-500/[0.12] text-white shadow-[0_0_25px_rgba(139,92,246,0.07)]"
                      : "border border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${
                      active
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-white/[0.04] text-gray-500 group-hover:text-violet-300"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>

                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-5">
          <div className="rounded-2xl border border-violet-500/15 bg-gradient-to-br from-violet-500/[0.10] to-blue-500/[0.04] p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
              <p className="text-xs font-semibold text-gray-200">
                Administration
              </p>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-gray-500">
              Manage the ClipTN platform, its users, campaigns, and safety.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="mt-4 flex items-center gap-3 rounded-xl border border-white/[0.07] px-3 py-3 text-xs font-medium text-gray-400 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-white"
          >
            <span className="text-base">↗</span>
            Return to user dashboard
          </Link>

          <p className="mt-5 px-1 text-[9px] text-gray-700">
            CLIPTN ADMINISTRATION · SECURE WORKSPACE
          </p>
        </div>
      </aside>

      {/* Page content */}
      <div className="min-h-screen lg:pl-[270px]">
        {children}
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#08080d]" />
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
