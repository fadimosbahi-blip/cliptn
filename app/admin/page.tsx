
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminUserRow = {
  total_users: number;
};

type OverviewStats = {
  totalUsers: number;
  pendingCampaigns: number;
  pendingVerifications: number;
};

const emptyStats: OverviewStats = {
  totalUsers: 0,
  pendingCampaigns: 0,
  pendingVerifications: 0,
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<OverviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const [
      { data: usersData, error: usersError },
      { data: campaignsData, error: campaignsError },
      { data: verificationsData, error: verificationsError },
    ] = await Promise.all([
      supabase.rpc("admin_get_users", {
        p_search: null,
        p_role: "all",
        p_limit: 1,
        p_offset: 0,
      }),
      supabase.rpc("admin_get_pending_campaigns"),
      supabase.rpc("admin_get_verification_requests"),
    ]);

    const requestError =
      usersError || campaignsError || verificationsError;

    if (requestError) {
      setError(
        requestError.message.includes("Administrator access required")
          ? "Administrator access is required to view this page."
          : requestError.message
      );
      setLoading(false);
      return;
    }

    const userRows = (usersData ?? []) as AdminUserRow[];

    setStats({
      totalUsers: Number(userRows[0]?.total_users ?? 0),
      pendingCampaigns: campaignsData?.length ?? 0,
      pendingVerifications: verificationsData?.length ?? 0,
    });

    setLastUpdated(new Date());
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const cards = [
    {
      label: "Registered users",
      value: stats.totalUsers,
      description: "Total accounts on ClipTN",
      icon: "♙",
      href: "/admin/users",
      accent: "text-blue-300",
      glow: "from-blue-500/[0.12]",
    },
    {
      label: "Campaign approvals",
      value: stats.pendingCampaigns,
      description: "Waiting for administrator review",
      icon: "▣",
      href: "/admin/campaigns",
      accent: "text-violet-300",
      glow: "from-violet-500/[0.12]",
    },
    {
      label: "Verification requests",
      value: stats.pendingVerifications,
      description: "Applications awaiting a decision",
      icon: "✓",
      href: "/admin/verifications",
      accent: "text-amber-300",
      glow: "from-amber-500/[0.10]",
    },
  ];

  const managementLinks = [
    {
      title: "User management",
      description: "Browse accounts, inspect activity, and manage restrictions.",
      href: "/admin/users",
      icon: "♙",
    },
    {
      title: "Campaign review",
      description: "Review campaign details and approve marketplace listings.",
      href: "/admin/campaigns",
      icon: "▣",
    },
    {
      title: "Verification center",
      description: "Review applications and manage verified badges.",
      href: "/admin/verifications",
      icon: "✓",
    },
    {
      title: "Reports and disputes",
      description: "Review user complaints and payment-related disputes.",
      href: "/admin/reports",
      icon: "⚑",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08080d] px-5 py-8 text-white sm:px-8 lg:px-10">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-blue-900/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-[1450px]">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300">
                Administration workspace
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Control <span className="text-violet-400">Center</span>
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Monitor ClipTN, manage your community, and keep the platform
              running smoothly.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOverview()}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh overview"}
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-7 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Welcome panel */}
        <section className="mb-8 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] via-[#111119] to-blue-500/[0.06] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                ClipTN platform administration
              </p>

              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Welcome to your command center.
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Everything you need to oversee campaigns, creators,
                verification applications, and community safety is
                accessible from one place.
              </p>
            </div>

            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/20 bg-violet-500/10 text-4xl text-violet-300 shadow-[0_0_45px_rgba(139,92,246,0.12)]">
              ◈
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Platform overview</h2>
              <p className="mt-1 text-xs text-gray-500">
                Live information retrieved from your admin database functions.
              </p>
            </div>

            {lastUpdated && (
              <p className="text-[10px] text-gray-600">
                Updated {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`group rounded-2xl border border-white/[0.07] bg-gradient-to-br ${card.glow} to-[#111119] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-500/30`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">
                    {card.label}
                  </span>
                  <span className={`text-2xl ${card.accent}`}>
                    {card.icon}
                  </span>
                </div>

                <p className="mt-5 text-4xl font-bold tracking-tight">
                  {loading ? "—" : card.value.toLocaleString()}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {card.description}
                </p>

                <p className="mt-5 text-xs font-semibold text-violet-300 transition group-hover:text-violet-200">
                  Open section →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Management */}
        <section className="mb-10">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Management workspace</h2>
            <p className="mt-1 text-xs text-gray-500">
              Navigate directly to an administration section.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {managementLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex gap-4 rounded-2xl border border-white/[0.07] bg-[#111119] p-5 transition duration-300 hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-xl text-violet-300 transition group-hover:bg-violet-500/15">
                  {item.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="text-violet-400 transition group-hover:translate-x-1">
                      →
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Operational reminder */}
        <section className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-lg text-blue-300">
              i
            </div>

            <div>
              <h3 className="text-sm font-semibold">
                Platform responsibility
              </h3>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-gray-500">
                Review reports objectively, verify evidence before taking
                enforcement action, and keep moderation decisions
                consistent. Administrative actions should always be
                supported by a clear reason.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/[0.06] py-6 text-center">
          <p className="text-[10px] tracking-wide text-gray-600">
            CLIPTN ADMIN CONTROL CENTER · PLATFORM MANAGEMENT
          </p>
        </footer>
      </div>
    </main>
  );
}
