
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
  source_url: string;
  cover_image_url: string | null;
  budget_total: number;
  reward_per_1000: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

const platforms = ["All", "TikTok", "YouTube", "Instagram"];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
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

function getPlatformStyle(platform: string) {
  switch (platform) {
    case "TikTok":
      return "border-pink-400/20 bg-pink-400/10 text-pink-300";
    case "YouTube":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "Instagram":
      return "border-orange-400/20 bg-orange-400/10 text-orange-300";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

function getPlatformSymbol(platform: string) {
  switch (platform) {
    case "TikTok":
      return "♪";
    case "YouTube":
      return "▶";
    case "Instagram":
      return "◎";
    default:
      return "◇";
  }
}

export default function DiscoverCampaignsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

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
          return;
        }

        if (profile.role !== "clipper") {
          router.replace("/dashboard");
          return;
        }

        const { data, error: campaignError } = await supabase
          .from("campaigns")
          .select(
            "id, title, description, platform, source_url, cover_image_url, budget_total, reward_per_1000, starts_at, ends_at, created_at"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (!active) return;

        if (campaignError) {
          console.error("Marketplace loading error:", campaignError);
          setError(
            "We couldn't load campaigns. Please refresh the page and try again."
          );
        } else {
          setCampaigns((data ?? []) as Campaign[]);
        }
      } catch (err) {
        console.error("Unexpected marketplace error:", err);

        if (active) {
          setError("Something went wrong while loading the marketplace.");
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

  const filteredCampaigns = useMemo(() => {
    const term = search.trim().toLowerCase();

    const results = campaigns.filter((campaign) => {
      const matchesPlatform =
        selectedPlatform === "All" ||
        campaign.platform === selectedPlatform;

      const matchesSearch =
        !term ||
        campaign.title.toLowerCase().includes(term) ||
        campaign.description.toLowerCase().includes(term) ||
        campaign.platform.toLowerCase().includes(term);

      return matchesPlatform && matchesSearch;
    });

    return [...results].sort((a, b) => {
      if (sortBy === "reward") {
        return Number(b.reward_per_1000) - Number(a.reward_per_1000);
      }

      if (sortBy === "budget") {
        return Number(b.budget_total) - Number(a.budget_total);
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    });
  }, [campaigns, search, selectedPlatform, sortBy]);

  const platformCounts = useMemo(() => {
    return {
      All: campaigns.length,
      TikTok: campaigns.filter((c) => c.platform === "TikTok").length,
      YouTube: campaigns.filter((c) => c.platform === "YouTube").length,
      Instagram: campaigns.filter((c) => c.platform === "Instagram").length,
    };
  }, [campaigns]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Discovering opportunities...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-7 text-white sm:px-8 lg:px-12">
      <style>{`
        @keyframes marketplaceGlow {
          0%, 100% { opacity: .2; transform: scale(1); }
          50% { opacity: .45; transform: scale(1.12); }
        }

        @keyframes marketplaceEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .marketplace-glow {
          animation: marketplaceGlow 9s ease-in-out infinite;
        }

        .marketplace-enter {
          animation: marketplaceEnter .55s ease-out both;
        }

        .marketplace-delay-1 { animation-delay: .08s; }
        .marketplace-delay-2 { animation-delay: .16s; }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="marketplace-glow pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-indigo-700/[0.08] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        {/* HEADER */}
        <header className="marketplace-enter mb-9 border-b border-white/[0.07] pb-8">
          <Link
            href="/dashboard"
            className="text-xs text-zinc-500 transition hover:text-violet-300"
          >
            ← Back to dashboard
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-lg border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-violet-300">
                  Clipper workspace
                </span>

                <span className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,.7)]" />
                  Marketplace
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Find your next{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
                  opportunity.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                Discover creator campaigns, choose content that matches your
                style and turn your editing skills into opportunities.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[290px]">
              <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] to-[#14121c] p-4">
                <p className="text-[10px] text-zinc-400">
                  Available campaigns
                </p>
                <p className="mt-2 text-3xl font-black tabular-nums text-violet-300">
                  {campaigns.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-4">
                <p className="text-[10px] text-zinc-400">
                  Platforms
                </p>
                <p className="mt-2 text-3xl font-black tabular-nums">
                  {platforms.length - 1}
                </p>
                <p className="mt-1 text-[9px] text-zinc-600">
                  Supported platforms
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* SEARCH AND FILTERS */}
        <section className="marketplace-enter marketplace-delay-1 mb-9">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Explore
              </p>
              <h2 className="mt-1 text-lg font-bold">
                Discover campaigns
              </h2>
            </div>

            <span className="text-xs text-zinc-500">
              {filteredCampaigns.length} opportunities found
            </span>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-zinc-500">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by campaign name, description or platform..."
                className="w-full rounded-xl border border-white/[0.08] bg-[#14121c] py-4 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#14121c] px-4">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Sort by
              </span>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="min-w-0 flex-1 bg-transparent py-4 text-xs font-semibold text-zinc-200 outline-none"
              >
                <option value="newest" className="bg-[#14121c]">
                  Newest
                </option>
                <option value="reward" className="bg-[#14121c]">
                  Highest reward
                </option>
                <option value="budget" className="bg-[#14121c]">
                  Highest budget
                </option>
              </select>
            </div>
          </div>

          {/* PLATFORM FILTERS */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              Platform
            </span>

            {platforms.map((platform) => {
              const selected = selectedPlatform === platform;

              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11px] font-semibold transition ${
                    selected
                      ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                      : "border-white/[0.07] bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {platform}
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9px] ${
                      selected
                        ? "bg-violet-400/15 text-violet-200"
                        : "bg-white/[0.05] text-zinc-500"
                    }`}
                  >
                    {platformCounts[platform as keyof typeof platformCounts]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
            {error}
          </div>
        )}

        {/* EMPTY STATE */}
        {!error && filteredCampaigns.length === 0 && (
          <div className="marketplace-enter rounded-3xl border border-dashed border-white/[0.10] bg-[#12111b] px-6 py-16 text-center">
            <div className="marketplace-glow mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-indigo-500/10 text-4xl text-violet-300">
              ◇
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
              ClipTN marketplace
            </p>

            <h3 className="mt-3 text-xl font-bold">
              {campaigns.length === 0
                ? "No active campaigns yet"
                : "No matching opportunities"}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              {campaigns.length === 0
                ? "New opportunities will appear here when creators launch approved campaigns. Check back soon!"
                : "Try a different search or platform filter to discover more opportunities."}
            </p>

            {(search || selectedPlatform !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedPlatform("All");
                }}
                className="mt-6 rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-5 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/[0.15]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* CAMPAIGN CARDS */}
        {!error && filteredCampaigns.length > 0 && (
          <section className="marketplace-enter marketplace-delay-2 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCampaigns.map((campaign) => (
              <article
                key={campaign.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#14121c] transition duration-300 hover:-translate-y-1 hover:border-violet-400/25 hover:shadow-xl hover:shadow-violet-950/10"
              >
                {/* CAMPAIGN COVER */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#392257] via-[#211833] to-[#10101a]">
                  {campaign.cover_image_url ? (
                    <img
                      src={campaign.cover_image_url}
                      alt={`${campaign.title} campaign cover`}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <>
                      <div className="marketplace-glow absolute -right-10 -top-20 h-64 w-64 rounded-full bg-violet-500/25 blur-3xl" />
                      <div className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-7xl font-black text-white/15">
                          {getPlatformSymbol(campaign.platform)}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#14121c] via-transparent to-black/10" />
                      <span className="absolute bottom-4 left-5 text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
                        ClipTN opportunity
                      </span>
                    </>
                  )}

                  <div className="absolute left-4 top-4">
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[9px] font-bold backdrop-blur-md ${getPlatformStyle(campaign.platform)}`}
                    >
                      {campaign.platform}
                    </span>
                  </div>

                  <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/40 px-3 py-1.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.7)]" />
                    ACTIVE
                  </div>
                </div>

                {/* CAMPAIGN DETAILS */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="break-words text-lg font-bold leading-6 transition group-hover:text-violet-200">
                      {campaign.title}
                    </h3>
                  </div>

                  <p className="mt-3 line-clamp-3 min-h-[60px] text-xs leading-5 text-zinc-400">
                    {campaign.description}
                  </p>

                  {/* REWARD HIGHLIGHT */}
                  <div className="mt-5 rounded-xl border border-violet-400/15 bg-gradient-to-r from-violet-500/[0.10] to-indigo-500/[0.06] p-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-300/70">
                      Reward per 1,000 qualified views
                    </p>

                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-black tabular-nums text-violet-200">
                        {formatMoney(campaign.reward_per_1000)}
                      </span>
                      <span className="text-xs font-semibold text-zinc-400">
                        TND
                      </span>
                    </div>
                  </div>

                  {/* BUDGET */}
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                    <span className="text-[10px] text-zinc-500">
                      Campaign budget
                    </span>
                    <span className="text-sm font-bold tabular-nums text-white">
                      {formatMoney(campaign.budget_total)}{" "}
                      <span className="text-[10px] font-medium text-zinc-500">
                        TND
                      </span>
                    </span>
                  </div>

                  {/* DATES */}
                  <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-[10px] text-zinc-500">
                    <div className="flex justify-between gap-3">
                      <span>Campaign starts</span>
                      <span className="text-zinc-300">
                        {formatDate(campaign.starts_at)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>Campaign ends</span>
                      <span className="text-zinc-300">
                        {formatDate(campaign.ends_at)}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-auto flex flex-col gap-2 pt-5">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/20 transition hover:-translate-y-0.5 hover:bg-violet-500"
                    >
                      View campaign
                      <span className="transition group-hover:translate-x-1">
                        →
                      </span>
                    </Link>

                    <a
                      href={campaign.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-semibold text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/[0.07] hover:text-white"
                    >
                      Watch original content ↗
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* FOOTER */}
        <footer className="mt-14 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
