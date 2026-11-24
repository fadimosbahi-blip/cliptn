
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  title: string;
  description: string;
  platform: string;
  cover_image_url: string | null;
  budget_total: number;
  reward_per_1000: number;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type BudgetSummary = {
  campaign_id: string;
  budget_total: number | string;
  allocated_rewards: number | string;
  remaining_budget: number | string;
  total_verified_views: number | string;
  total_submissions: number;
};

type Filter =
  | "all"
  | "draft"
  | "pending_approval"
  | "active"
  | "completed"
  | "under_review"
  | "closed";

const filters: { label: string; value: Filter }[] = [
  { label: "All campaigns", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Pending", value: "pending_approval" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Under review", value: "under_review" },
  { label: "Closed", value: "closed" },
];

const statusStyles: Record<string, string> = {
  draft: "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
  pending_approval: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  completed: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  under_review: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  closed: "border-red-500/20 bg-red-500/10 text-red-300",
};

function formatMoney(value: number | string) {
  return new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

function formatViews(value: number | string) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getPlatformSymbol(platform: string) {
  if (platform === "TikTok") return "♪";
  if (platform === "YouTube") return "▶";
  if (platform === "Instagram") return "◎";
  return "◇";
}

export default function MyCampaignsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budgetSummaries, setBudgetSummaries] = useState<
    Record<string, BudgetSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [budgetError, setBudgetError] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      try {
        const supabase = createClient();

        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (!active) return;

        if (profileError || !profile) {
          setError("We couldn't verify your account. Please try again.");
          setLoading(false);
          return;
        }

        if (profile.role !== "streamer") {
          router.replace("/dashboard");
          return;
        }

        const { data, error: campaignError } = await supabase
          .from("campaigns")
          .select(
            "id, title, description, platform, cover_image_url, budget_total, reward_per_1000, status, starts_at, ends_at, created_at"
          )
          .eq("streamer_id", authData.user.id)
          .order("created_at", { ascending: false });

        if (!active) return;

        if (campaignError) {
          console.error("Campaign loading error:", campaignError);
          setError(
            "We couldn't load your campaigns. Please refresh the page and try again."
          );
          return;
        }

        const loadedCampaigns = (data ?? []) as Campaign[];
        setCampaigns(loadedCampaigns);

        // Load live budget information for these campaigns.
        if (loadedCampaigns.length > 0) {
          const campaignIds = loadedCampaigns.map((campaign) => campaign.id);

          const { data: budgetData, error: summaryError } = await supabase
            .from("campaign_budget_summary")
            .select(
              "campaign_id, budget_total, allocated_rewards, remaining_budget, total_verified_views, total_submissions"
            )
            .in("campaign_id", campaignIds);

          if (!active) return;

          if (summaryError) {
            console.error("Campaign budget loading error:", summaryError);
            setBudgetError(
              "Budget information could not be loaded. Please check the database permissions."
            );
          } else {
            const summaries: Record<string, BudgetSummary> = {};

            for (const item of (budgetData ?? []) as BudgetSummary[]) {
              summaries[item.campaign_id] = item;
            }

            setBudgetSummaries(summaries);
          }
        }
      } catch (err) {
        console.error("Unexpected campaign loading error:", err);

        if (active) {
          setError("Something went wrong while loading your campaigns.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCampaigns();

    return () => {
      active = false;
    };
  }, [router]);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      drafts: campaigns.filter((c) => c.status === "draft").length,
      active: campaigns.filter((c) => c.status === "active").length,
      completed: campaigns.filter((c) => c.status === "completed").length,
    }),
    [campaigns]
  );

  const filteredCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesFilter = filter === "all" || campaign.status === filter;

      const matchesSearch =
        !term ||
        campaign.title.toLowerCase().includes(term) ||
        campaign.description.toLowerCase().includes(term) ||
        campaign.platform.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [campaigns, filter, search]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Preparing your campaign command center...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080810] px-5 py-7 text-white sm:px-8 lg:px-12">
      <style>{`
        @keyframes commandGlow {
          0%, 100% { opacity: .22; transform: scale(1); }
          50% { opacity: .48; transform: scale(1.13); }
        }

        @keyframes commandEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .command-glow {
          animation: commandGlow 9s ease-in-out infinite;
        }

        .command-enter {
          animation: commandEnter .55s ease-out both;
        }

        .command-delay-1 { animation-delay: .08s; }
        .command-delay-2 { animation-delay: .16s; }

        .command-scroll::-webkit-scrollbar { height: 4px; }
        .command-scroll::-webkit-scrollbar-thumb {
          background: rgba(167,139,250,.25);
          border-radius: 20px;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="command-glow pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-60 -left-40 h-[450px] w-[450px] rounded-full bg-indigo-700/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="command-enter mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-zinc-500 transition hover:text-violet-300"
            >
              ← Back to dashboard
            </Link>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                Streamer workspace
              </span>
              <span className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,.7)]" />
                Campaign manager
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Campaign{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                command center.
              </span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Your campaigns, budgets and publishing activity — organized in
              one place.
            </p>
          </div>

          <Link
            href="/create-campaign"
            className="inline-flex items-center justify-center gap-3 self-start rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-3.5 text-sm font-bold shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-fuchsia-500"
          >
            <span className="text-xl leading-none">+</span>
            Create campaign
          </Link>
        </header>

        {/* OVERVIEW */}
        <section className="command-enter command-delay-1 mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Overview
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Campaign performance
              </h2>
            </div>
            <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[10px] text-zinc-500">
              Live account data
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] to-[#14121c] p-5 transition hover:border-violet-400/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  Total campaigns
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-400/10 text-lg text-violet-300">
                  ◇
                </span>
              </div>
              <p className="mt-5 text-3xl font-black tabular-nums">
                {stats.total}
              </p>
              <p className="mt-2 text-[10px] text-zinc-500">
                Created from your account
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5 transition hover:border-white/15">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  Drafts
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-400/10 text-lg text-zinc-300">
                  ✎
                </span>
              </div>
              <p className="mt-5 text-3xl font-black tabular-nums">
                {stats.drafts}
              </p>
              <p className="mt-2 text-[10px] text-zinc-500">
                Saved, not yet submitted
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5 transition hover:border-emerald-400/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  Active campaigns
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-lg text-emerald-300">
                  ↗
                </span>
              </div>
              <p className="mt-5 text-3xl font-black tabular-nums">
                {stats.active}
              </p>
              <p className="mt-2 text-[10px] text-zinc-500">
                Currently approved and active
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5 transition hover:border-blue-400/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">
                  Completed
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-lg text-blue-300">
                  ✓
                </span>
              </div>
              <p className="mt-5 text-3xl font-black tabular-nums">
                {stats.completed}
              </p>
              <p className="mt-2 text-[10px] text-zinc-500">
                Campaigns marked completed
              </p>
            </div>
          </div>
        </section>

        {/* CAMPAIGN LIST */}
        <section className="command-enter command-delay-2">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Workspace
              </p>
              <h2 className="mt-1 text-xl font-bold">Your campaigns</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Browse and manage every campaign you've created.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Showing {filteredCampaigns.length} of {campaigns.length}
            </div>
          </div>

          {/* SEARCH */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns by name, description or platform..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#14121c] py-3.5 pl-11 pr-4 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>
          </div>

          {/* FILTERS */}
          <div className="command-scroll mb-6 flex gap-2 overflow-x-auto pb-2">
            {filters.map((item) => {
              const selected = filter === item.value;

              const count =
                item.value === "all"
                  ? campaigns.length
                  : campaigns.filter((c) => c.status === item.value).length;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-semibold transition ${
                    selected
                      ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                      : "border-white/[0.07] bg-[#14121c] text-zinc-500 hover:border-white/15 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9px] ${
                      selected
                        ? "bg-violet-400/15 text-violet-200"
                        : "bg-white/[0.05] text-zinc-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ERRORS */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/[0.08] p-4 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          {budgetError && (
            <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm leading-6 text-amber-200">
              {budgetError}
            </div>
          )}

          {/* EMPTY ACCOUNT */}
          {!error && campaigns.length === 0 && (
            <div className="overflow-hidden rounded-3xl border border-dashed border-white/[0.10] bg-[#12111b] px-6 py-16 text-center">
              <div className="command-glow mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-4xl text-violet-300">
                ◇
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                Your workspace starts here
              </p>
              <h3 className="mt-3 text-xl font-bold">No campaigns yet</h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                Create your first campaign, set your reward and give clippers
                an opportunity to work with your content.
              </p>
              <Link
                href="/create-campaign"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold transition hover:bg-violet-500"
              >
                Create your first campaign <span>→</span>
              </Link>
            </div>
          )}

          {/* NO FILTER RESULTS */}
          {!error && campaigns.length > 0 && filteredCampaigns.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] px-6 py-12 text-center">
              <div className="text-3xl text-zinc-600">⌕</div>
              <h3 className="mt-3 font-bold">No matching campaigns</h3>
              <p className="mt-2 text-xs text-zinc-500">
                Try another search or choose a different status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="mt-5 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* CAMPAIGN CARDS */}
          {!error && filteredCampaigns.length > 0 && (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredCampaigns.map((campaign) => {
                const budget = budgetSummaries[campaign.id];

                const totalBudget = budget
                  ? Number(budget.budget_total)
                  : Number(campaign.budget_total);

                const allocated = budget
                  ? Number(budget.allocated_rewards)
                  : 0;

                const remaining = budget
                  ? Number(budget.remaining_budget)
                  : totalBudget;

                const verifiedViews = budget
                  ? Number(budget.total_verified_views)
                  : 0;

                const totalSubmissions = budget
                  ? Number(budget.total_submissions)
                  : 0;

                const usagePercentage =
                  totalBudget > 0
                    ? Math.min(
                        100,
                        Math.max(0, (allocated / totalBudget) * 100)
                      )
                    : 0;

                const overBudget = allocated > totalBudget;

                return (
                  <article
                    key={campaign.id}
                    className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#14121c] transition duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:shadow-xl hover:shadow-violet-950/10"
                  >
                    {/* COVER */}
                    <div className="relative h-44 overflow-hidden bg-gradient-to-br from-[#392257] via-[#211833] to-[#10101a]">
                      {campaign.cover_image_url ? (
                        <img
                          src={campaign.cover_image_url}
                          alt={`${campaign.title} campaign cover`}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <>
                          <div className="command-glow absolute -right-10 -top-20 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
                          <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-6xl font-black text-white/15">
                              {getPlatformSymbol(campaign.platform)}
                            </span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-[#14121c] via-transparent to-black/10" />
                          <span className="absolute bottom-4 left-5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
                            ClipTN campaign
                          </span>
                        </>
                      )}

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-[9px] font-bold capitalize backdrop-blur-md ${
                            statusStyles[campaign.status] ?? statusStyles.draft
                          }`}
                        >
                          {formatStatus(campaign.status)}
                        </span>
                        <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[9px] font-semibold text-white/90 backdrop-blur-md">
                          {campaign.platform}
                        </span>
                      </div>

                      <span className="absolute bottom-4 right-4 rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-[9px] font-medium text-white/70 backdrop-blur-md">
                        Created {formatDate(campaign.created_at)}
                      </span>
                    </div>

                    {/* DETAILS */}
                    <div className="p-5 sm:p-6">
                      <h3 className="break-words text-lg font-bold leading-6 transition group-hover:text-violet-200">
                        {campaign.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 min-h-[44px] text-xs leading-5 text-zinc-500">
                        {campaign.description}
                      </p>

                      {/* ORIGINAL CAMPAIGN METRICS */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/[0.06] bg-[#0c0b13] p-4">
                          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                            Total budget
                          </p>
                          <p className="mt-2 text-xl font-black tabular-nums">
                            {formatMoney(campaign.budget_total)}
                          </p>
                          <p className="mt-1 text-[9px] text-zinc-600">TND</p>
                        </div>

                        <div className="rounded-xl border border-violet-400/10 bg-violet-400/[0.04] p-4">
                          <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                            Reward / 1K views
                          </p>
                          <p className="mt-2 text-xl font-black tabular-nums text-violet-300">
                            {formatMoney(campaign.reward_per_1000)}
                          </p>
                          <p className="mt-1 text-[9px] text-zinc-600">TND</p>
                        </div>
                      </div>

                      {/* LIVE BUDGET TRACKING */}
                      <div className="mt-5 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.07] to-[#0c0b13] p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-300">
                              Financial overview
                            </p>
                            <h4 className="mt-1 text-sm font-bold">
                              Budget tracking
                            </h4>
                          </div>

                          {budget && (
                            <span className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1.5 text-[9px] font-semibold text-emerald-300">
                              Live data
                            </span>
                          )}
                        </div>

                        {budget ? (
                          <>
                            <div className="mt-5 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] text-zinc-500">
                                  Allocated rewards
                                </p>
                                <p className="mt-1 text-lg font-bold tabular-nums">
                                  {formatMoney(allocated)}
                                  <span className="ml-1 text-[9px] font-medium text-zinc-500">
                                    TND
                                  </span>
                                </p>
                              </div>

                              <div>
                                <p className="text-[9px] text-zinc-500">
                                  Remaining budget
                                </p>
                                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
                                  {formatMoney(remaining)}
                                  <span className="ml-1 text-[9px] font-medium text-zinc-500">
                                    TND
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="mt-5">
                              <div className="mb-2 flex items-center justify-between text-[10px]">
                                <span className="text-zinc-500">
                                  Budget utilization
                                </span>
                                <span
                                  className={`font-bold tabular-nums ${
                                    overBudget
                                      ? "text-red-300"
                                      : "text-violet-300"
                                  }`}
                                >
                                  {usagePercentage.toFixed(1)}%
                                </span>
                              </div>

                              <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    overBudget
                                      ? "bg-red-400"
                                      : "bg-gradient-to-r from-violet-600 to-fuchsia-400"
                                  }`}
                                  style={{
                                    width: `${usagePercentage}%`,
                                  }}
                                />
                              </div>

                              <div className="mt-2 flex justify-between text-[9px] text-zinc-600">
                                <span>
                                  {formatMoney(allocated)} TND used
                                </span>
                                <span>
                                  {formatMoney(totalBudget)} TND total
                                </span>
                              </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10 text-sm text-violet-300">
                                  ◉
                                </span>
                                <div>
                                  <p className="text-[9px] text-zinc-500">
                                    Verified views
                                  </p>
                                  <p className="text-sm font-bold tabular-nums">
                                    {formatViews(verifiedViews)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-400/10 text-sm text-indigo-300">
                                  ▤
                                </span>
                                <div>
                                  <p className="text-[9px] text-zinc-500">
                                    Submissions
                                  </p>
                                  <p className="text-sm font-bold tabular-nums">
                                    {formatViews(totalSubmissions)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <p className="mt-4 text-[9px] leading-4 text-zinc-600">
                              Allocated rewards include pending, approved and
                              paid reward records. Rejected rewards are excluded.
                            </p>
                          </>
                        ) : (
                          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
                            <p className="text-xs text-zinc-400">
                              Budget information is not available for this
                              campaign right now.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* SCHEDULE */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-zinc-500">
                          <span>
                            <span className="text-zinc-600">Start</span>{" "}
                            {formatDate(campaign.starts_at)}
                          </span>
                          <span>
                            <span className="text-zinc-600">End</span>{" "}
                            {formatDate(campaign.ends_at)}
                          </span>
                        </div>

                        <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-600">
                          {campaign.status === "draft"
                            ? "Not published"
                            : campaign.status === "active"
                              ? "Campaign active"
                              : "Campaign status"}
                        </span>
                      </div>

                      {/* ACTION */}
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-[10px] text-zinc-600">
                          Campaign ID: {campaign.id.slice(0, 8)}
                        </span>

                        <Link
                          href={`/my-campaigns/${campaign.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2.5 text-[10px] font-bold text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-400/[0.12]"
                        >
                          Campaign details
                          <span className="text-sm">→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-14 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
