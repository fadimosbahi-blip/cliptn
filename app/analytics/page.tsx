
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  title: string;
  platform: string;
  budget_total: number;
  currency: string;
  reward_per_1000: number;
  status: string;
  created_at: string;
  starts_at: string;
  ends_at: string;
};

type Submission = {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string;
};

type Reward = {
  submission_id: string;
  verified_views: number;
  reward_amount: number;
  reward_status: string;
};

type BudgetSummary = {
  campaign_id: string;
  allocated_rewards: number;
  remaining_budget: number;
  total_verified_views: number;
  total_submissions: number;
};

type Period = "7" | "30" | "all";

const money = (value: number) =>
  `${value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} TND`;

const number = (value: number) =>
  value.toLocaleString("en-US");

const shortNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return number(value);
};

const dateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
  });

function isWithinPeriod(
  date: string,
  period: Period,
  referenceTime: number | null
) {
  if (period === "all") return true;
  if (referenceTime === null) return false;

  const timestamp = new Date(date).getTime();
  const days = Number(period);
  const cutoff = referenceTime - days * 24 * 60 * 60 * 1000;

  return timestamp >= cutoff && timestamp <= referenceTime;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    draft: "border-zinc-400/20 bg-zinc-400/10 text-zinc-400",
    pending_approval:
      "border-amber-400/20 bg-amber-400/10 text-amber-300",
    completed: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    under_review:
      "border-orange-400/20 bg-orange-400/10 text-orange-300",
    closed: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  const label = status.replaceAll("_", " ");

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold capitalize ${
        styles[status] ??
        "border-white/10 bg-white/5 text-zinc-400"
      }`}
    >
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  symbol,
  accent = "violet",
}: {
  label: string;
  value: string;
  description: string;
  symbol: string;
  accent?: "violet" | "green" | "blue" | "amber";
}) {
  const accents = {
    violet: "border-violet-400/15 bg-violet-400/[0.08] text-violet-300",
    green: "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300",
    blue: "border-blue-400/15 bg-blue-400/[0.08] text-blue-300",
    amber: "border-amber-400/15 bg-amber-400/[0.08] text-amber-300",
  };

  return (
    <div className="analytics-card rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191625] to-[#111019] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400">{label}</p>
          <h3 className="mt-4 break-words text-2xl font-black tracking-tight text-white sm:text-3xl">
            {value}
          </h3>
          <p className="mt-2 text-[11px] leading-5 text-zinc-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${accents[accent]}`}
        >
          {symbol}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [budgets, setBudgets] = useState<BudgetSummary[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [referenceTime, setReferenceTime] = useState<number | null>(null);

  useEffect(() => {
    setReferenceTime(Date.now());
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setError("We couldn't load your account information.");
      setLoading(false);
      return;
    }

    if (profile.role !== "streamer") {
      router.replace("/dashboard");
      return;
    }

    setProfileName(profile.full_name);

    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id, title, platform, budget_total, currency, reward_per_1000, status, created_at, starts_at, ends_at"
      )
      .eq("streamer_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (campaignError) {
      setError("We couldn't load your campaign analytics.");
      setLoading(false);
      return;
    }

    const campaignList = (campaignData ?? []) as Campaign[];
    setCampaigns(campaignList);

    if (campaignList.length === 0) {
      setSubmissions([]);
      setRewards([]);
      setBudgets([]);
      setLoading(false);
      return;
    }

    const campaignIds = campaignList.map((campaign) => campaign.id);

    const { data: submissionData, error: submissionError } =
      await supabase
        .from("submissions")
        .select("id, campaign_id, status, submitted_at")
        .in("campaign_id", campaignIds)
        .order("submitted_at", { ascending: false });

    if (submissionError) {
      setError("We couldn't load your campaign submissions.");
      setLoading(false);
      return;
    }

    const submissionList = (submissionData ?? []) as Submission[];
    setSubmissions(submissionList);

    const submissionIds = submissionList.map((item) => item.id);

    if (submissionIds.length > 0) {
      const { data: rewardData, error: rewardError } = await supabase
        .from("submission_rewards")
        .select(
          "submission_id, verified_views, reward_amount, reward_status"
        )
        .in("submission_id", submissionIds);

      if (rewardError) {
        setError("We couldn't load your reward analytics.");
        setLoading(false);
        return;
      }

      setRewards((rewardData ?? []) as Reward[]);
    } else {
      setRewards([]);
    }

    const { data: budgetData, error: budgetError } = await supabase
      .from("campaign_budget_summary")
      .select(
        "campaign_id, allocated_rewards, remaining_budget, total_verified_views, total_submissions"
      )
      .in("campaign_id", campaignIds);

    if (budgetError) {
      setError("We couldn't load campaign budget analytics.");
      setLoading(false);
      return;
    }

    setBudgets((budgetData ?? []) as BudgetSummary[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const analytics = useMemo(() => {
    const filteredSubmissions = submissions.filter((item) =>
      isWithinPeriod(item.submitted_at, period, referenceTime)
    );

    const filteredIds = new Set(
      filteredSubmissions.map((item) => item.id)
    );

    const rewardMap = new Map(
      rewards.map((reward) => [reward.submission_id, reward])
    );

    const filteredRewards = rewards.filter((reward) =>
      filteredIds.has(reward.submission_id)
    );

    const approvedClips = filteredSubmissions.filter(
      (item) => item.status === "approved"
    ).length;

    const pendingClips = filteredSubmissions.filter(
      (item) => item.status === "pending"
    ).length;

    const verifiedViews = filteredRewards.reduce(
      (total, item) =>
        total + Number(item.verified_views || 0),
      0
    );

    const pendingRewards = filteredRewards
      .filter((item) => item.reward_status === "pending")
      .reduce((total, item) => total + Number(item.reward_amount || 0), 0);

    const approvedRewards = filteredRewards
      .filter((item) => item.reward_status === "approved")
      .reduce((total, item) => total + Number(item.reward_amount || 0), 0);

    const paidRewards = filteredRewards
      .filter((item) => item.reward_status === "paid")
      .reduce((total, item) => total + Number(item.reward_amount || 0), 0);

    const totalBudget = campaigns.reduce(
      (total, item) => total + Number(item.budget_total || 0),
      0
    );

    const allocatedBudget = budgets.reduce(
      (total, item) => total + Number(item.allocated_rewards || 0),
      0
    );

    const remainingBudget = budgets.reduce(
      (total, item) => total + Number(item.remaining_budget || 0),
      0
    );

    const activeCampaigns = campaigns.filter(
      (item) => item.status === "active"
    ).length;

    const campaignPerformance = campaigns.map((campaign) => {
      const campaignSubmissions = filteredSubmissions.filter(
        (item) => item.campaign_id === campaign.id
      );

      const campaignRewards = campaignSubmissions
        .map((item) => rewardMap.get(item.id))
        .filter((item): item is Reward => Boolean(item));

      return {
        ...campaign,
        submissionCount: campaignSubmissions.length,
        approvedCount: campaignSubmissions.filter(
          (item) => item.status === "approved"
        ).length,
        views: campaignRewards.reduce(
          (total, item) => total + Number(item.verified_views || 0),
          0
        ),
        rewardAmount: campaignRewards.reduce(
          (total, item) => total + Number(item.reward_amount || 0),
          0
        ),
      };
    });

    const lastSevenDays =
      referenceTime === null
        ? []
        : Array.from({ length: 7 }, (_, index) => {
            const date = new Date(referenceTime);
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));

            const count = submissions.filter((item) => {
              const submitted = new Date(item.submitted_at);
              return submitted.toDateString() === date.toDateString();
            }).length;

            return {
              label: dateLabel(date),
              count,
            };
          });

    return {
      filteredSubmissions,
      approvedClips,
      pendingClips,
      verifiedViews,
      pendingRewards,
      approvedRewards,
      paidRewards,
      totalBudget,
      allocatedBudget,
      remainingBudget,
      activeCampaigns,
      campaignPerformance,
      lastSevenDays,
    };
  }, [campaigns, submissions, rewards, budgets, period, referenceTime]);

  const maxDailySubmissions = Math.max(
    ...analytics.lastSevenDays.map((item) => item.count),
    1
  );

  const maxCampaignViews = Math.max(
    ...analytics.campaignPerformance.map((item) => item.views),
    1
  );

  const firstName = profileName.split(" ")[0];

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Preparing your analytics...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <style>{`
        @keyframes analyticsEnter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .analytics-enter {
          animation: analyticsEnter .6s ease-out both;
        }

        .analytics-card {
          transition: transform .3s ease, border-color .3s ease,
            box-shadow .3s ease;
        }

        .analytics-card:hover {
          transform: translateY(-3px);
          border-color: rgba(167,139,250,.3);
          box-shadow: 0 15px 40px rgba(91,33,182,.08);
        }

        .analytics-bar {
          transition: height .5s ease;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-9 flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-bold tracking-tight text-white"
            >
              Clip<span className="text-violet-400">TN</span>
              <span className="ml-2 text-zinc-600">/ Analytics</span>
            </Link>

            <div className="mt-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                Performance centre
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Your Analytics
              </h1>

              <p className="mt-2 text-sm text-zinc-400">
                Understand your campaigns, submissions and rewards, {firstName}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              ← Dashboard
            </Link>

            <Link
              href="/my-campaigns"
              className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
            >
              My Campaigns →
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-7 rounded-2xl border border-red-500/20 bg-red-500/[0.08] p-5 text-sm text-red-300">
            <p className="font-semibold">Analytics loading issue</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={loadAnalytics}
              className="mt-3 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold transition hover:bg-red-400/10"
            >
              Try again
            </button>
          </div>
        )}

        <section className="analytics-enter mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-bold">Performance overview</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Your campaign activity and reward performance.
            </p>
          </div>

          <div className="flex rounded-xl border border-white/[0.08] bg-[#12111b] p-1">
            {[
              { label: "7 days", value: "7" },
              { label: "30 days", value: "30" },
              { label: "All time", value: "all" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setPeriod(option.value as Period)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                  period === option.value
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-950/30"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total campaigns"
            value={number(campaigns.length)}
            description={`${analytics.activeCampaigns} currently active`}
            symbol="◈"
            accent="violet"
          />

          <MetricCard
            label="Total submissions"
            value={number(analytics.filteredSubmissions.length)}
            description={`${number(analytics.approvedClips)} approved clips`}
            symbol="▤"
            accent="blue"
          />

          <MetricCard
            label="Verified views"
            value={shortNumber(analytics.verifiedViews)}
            description="Views recorded in reward records"
            symbol="◉"
            accent="green"
          />

          <MetricCard
            label="Allocated rewards"
            value={money(analytics.allocatedBudget)}
            description="Across all your campaigns"
            symbol="◈"
            accent="amber"
          />
        </section>

        <section className="mb-9 grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-6 lg:col-span-2">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold">Submission activity</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  New submissions received over the last seven days
                </p>
              </div>
              <span className="rounded-lg border border-violet-400/15 bg-violet-400/[0.06] px-3 py-2 text-[10px] font-semibold text-violet-300">
                Last 7 days
              </span>
            </div>

            <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
              {analytics.lastSevenDays.map((day, index) => (
                <div
                  key={`${day.label}-${index}`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-3"
                >
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {day.count}
                  </span>

                  <div className="flex h-36 w-full items-end overflow-hidden rounded-t-lg bg-white/[0.025]">
                    <div
                      className="analytics-bar w-full rounded-t-lg bg-gradient-to-t from-violet-700 to-fuchsia-400 shadow-[0_0_18px_rgba(139,92,246,0.15)]"
                      style={{
                        height: `${
                          day.count === 0
                            ? 2
                            : Math.max(
                                (day.count / maxDailySubmissions) * 100,
                                8
                              )
                        }%`,
                      }}
                    />
                  </div>

                  <span className="text-[9px] text-zinc-500 sm:text-[10px]">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-6">
            <h2 className="font-bold">Campaign budget</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Overall budget allocation
            </p>

            <div className="mt-7">
              <p className="text-xs text-zinc-500">Total campaign budgets</p>
              <p className="mt-2 break-words text-2xl font-black">
                {money(analytics.totalBudget)}
              </p>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-700"
                style={{
                  width: `${
                    analytics.totalBudget > 0
                      ? Math.min(
                          (analytics.allocatedBudget / analytics.totalBudget) *
                            100,
                          100
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  Allocated rewards
                </span>
                <span className="text-sm font-semibold text-violet-300">
                  {money(analytics.allocatedBudget)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  Remaining budget
                </span>
                <span className="text-sm font-semibold text-emerald-300">
                  {money(analytics.remainingBudget)}
                </span>
              </div>
            </div>

            <p className="mt-5 border-t border-white/[0.06] pt-4 text-[10px] leading-5 text-zinc-600">
              Allocated rewards include pending, approved and paid reward
              records. This is a budget summary, not a payout confirmation.
            </p>
          </div>
        </section>

        <section className="mb-9 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-amber-400/10 bg-[#15131c] p-5">
            <p className="text-xs text-zinc-500">Pending rewards</p>
            <p className="mt-3 text-xl font-bold text-amber-300">
              {money(analytics.pendingRewards)}
            </p>
            <p className="mt-2 text-[10px] text-zinc-600">
              Awaiting reward approval
            </p>
          </div>

          <div className="rounded-2xl border border-violet-400/10 bg-[#15131c] p-5">
            <p className="text-xs text-zinc-500">Approved rewards</p>
            <p className="mt-3 text-xl font-bold text-violet-300">
              {money(analytics.approvedRewards)}
            </p>
            <p className="mt-2 text-[10px] text-zinc-600">
              Approved, not necessarily paid
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/10 bg-[#15131c] p-5">
            <p className="text-xs text-zinc-500">Paid rewards</p>
            <p className="mt-3 text-xl font-bold text-emerald-300">
              {money(analytics.paidRewards)}
            </p>
            <p className="mt-2 text-[10px] text-zinc-600">
              Records marked as paid
            </p>
          </div>
        </section>

        <section className="mb-9 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12111b]">
          <div className="flex flex-col justify-between gap-3 border-b border-white/[0.06] p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Campaign performance</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Compare submissions and verified views across your campaigns
              </p>
            </div>

            <Link
              href="/my-campaigns"
              className="text-xs font-semibold text-violet-300 transition hover:text-violet-200"
            >
              View all campaigns →
            </Link>
          </div>

          {analytics.campaignPerformance.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/[0.08] text-2xl text-violet-300">
                ◈
              </div>
              <h3 className="font-semibold text-zinc-200">
                No campaigns yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-zinc-500">
                Create your first campaign to start tracking its performance
                and discovering how clippers engage with your content.
              </p>
              <Link
                href="/create-campaign"
                className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-xs font-semibold transition hover:bg-violet-500"
              >
                Create your first campaign →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {analytics.campaignPerformance.map((campaign) => (
                <div
                  key={campaign.id}
                  className="p-5 transition hover:bg-white/[0.015] sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-semibold text-white">
                          {campaign.title}
                        </h3>
                        <StatusBadge status={campaign.status} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {campaign.platform} · Reward rate:{" "}
                        {money(Number(campaign.reward_per_1000))} / 1,000 views
                      </p>
                    </div>

                    <Link
                      href={`/my-campaigns/${campaign.id}`}
                      className="shrink-0 text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                    >
                      View campaign →
                    </Link>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] text-zinc-600">
                        Submissions
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {number(campaign.submissionCount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-600">
                        Approved clips
                      </p>
                      <p className="mt-1 text-lg font-bold text-emerald-300">
                        {number(campaign.approvedCount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-600">
                        Verified views
                      </p>
                      <p className="mt-1 text-lg font-bold text-violet-300">
                        {shortNumber(campaign.views)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-600">
                        Recorded rewards
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {money(campaign.rewardAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
                      style={{
                        width: `${
                          campaign.views > 0
                            ? Math.max(
                                (campaign.views / maxCampaignViews) * 100,
                                3
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-9 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-6">
            <h2 className="font-bold">Submission overview</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Current period:{" "}
              {period === "all"
                ? "All time"
                : `Last ${period} days`}
            </p>

            <div className="mt-7 space-y-6">
              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-zinc-400">Approved</span>
                  <span className="font-semibold text-emerald-300">
                    {number(analytics.approvedClips)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${
                        analytics.filteredSubmissions.length
                          ? (analytics.approvedClips /
                              analytics.filteredSubmissions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-zinc-400">Pending review</span>
                  <span className="font-semibold text-amber-300">
                    {number(analytics.pendingClips)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width: `${
                        analytics.filteredSubmissions.length
                          ? (analytics.pendingClips /
                              analytics.filteredSubmissions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <p className="mt-7 text-[10px] leading-5 text-zinc-600">
              Submission approval and reward approval are separate processes.
              These figures reflect clip review statuses.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-6">
            <h2 className="font-bold">Quick actions</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Manage your campaigns and incoming clips
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/create-campaign"
                className="group rounded-xl border border-violet-400/15 bg-violet-400/[0.05] p-4 transition hover:border-violet-400/30 hover:bg-violet-400/[0.09]"
              >
                <span className="text-xl text-violet-300">+</span>
                <p className="mt-3 text-sm font-semibold">
                  Create campaign
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Launch a new opportunity
                </p>
              </Link>

              <Link
                href="/submissions"
                className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="text-xl text-blue-300">▤</span>
                <p className="mt-3 text-sm font-semibold">
                  Review submissions
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Review clips and rewards
                </p>
              </Link>

              <Link
                href="/my-campaigns"
                className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="text-xl text-emerald-300">◈</span>
                <p className="mt-3 text-sm font-semibold">
                  Manage campaigns
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  View budgets and performance
                </p>
              </Link>

              <Link
                href="/settings"
                className="group rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
              >
                <span className="text-xl text-zinc-300">⚙</span>
                <p className="mt-3 text-sm font-semibold">
                  Account settings
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Manage your account
                </p>
              </Link>
            </div>
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600 sm:flex-row sm:text-left">
          <p>© ClipTN. All rights reserved.</p>
          <p>Built for creators. Made with ambition in Tunisia 🇹🇳</p>
        </footer>
      </div>
    </main>
  );
}
