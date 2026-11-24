
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  id: string;
  campaign_id: string;
  status: string;
  submitted_at: string;
  review_notes: string | null;
};

type Campaign = {
  id: string;
  title: string;
  platform: string;
  reward_per_1000: number;
};

type Reward = {
  submission_id: string;
  verified_views: number;
  reward_amount: number;
  reward_status: string;
};

type EarningsRecord = {
  submission: Submission;
  campaign: Campaign | null;
  reward: Reward | null;
};

const money = (value: number) =>
  `${Number(value || 0).toFixed(3)} TND`;

const number = (value: number) =>
  new Intl.NumberFormat("en-US").format(value || 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    paid: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    rejected: "border-red-400/20 bg-red-400/10 text-red-300",
    under_review: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold capitalize ${
        styles[status] ||
        "border-zinc-400/20 bg-zinc-400/10 text-zinc-400"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({
  label,
  value,
  description,
  symbol,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  symbol: string;
  accent: "violet" | "emerald" | "amber" | "blue";
}) {
  const accents = {
    violet: "border-violet-400/20 bg-violet-400/[0.08] text-violet-300",
    emerald: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
    blue: "border-blue-400/20 bg-blue-400/[0.08] text-blue-300",
  };

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#191625] to-[#111019] p-5 transition duration-300 hover:-translate-y-1 hover:border-violet-400/25">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{label}</p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg ${accents[accent]}`}
        >
          {symbol}
        </span>
      </div>

      <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 text-xs text-zinc-500">{description}</p>
    </div>
  );
}

export default function EarningsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [records, setRecords] = useState<EarningsRecord[]>([]);
  const [filter, setFilter] = useState("all");

  const loadEarnings = useCallback(async () => {
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
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      setError("We couldn't load your account.");
      setLoading(false);
      return;
    }

    if (profile.role !== "clipper") {
      router.replace("/dashboard");
      return;
    }

    const { data: submissionData, error: submissionError } =
      await supabase
        .from("submissions")
        .select("id, campaign_id, status, submitted_at, review_notes")
        .eq("clipper_id", authData.user.id)
        .order("submitted_at", { ascending: false });

    if (submissionError) {
      setError("We couldn't load your earnings history.");
      setLoading(false);
      return;
    }

    const submissionList = (submissionData || []) as Submission[];

    if (submissionList.length === 0) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const submissionIds = submissionList.map((item) => item.id);
    const campaignIds = [
      ...new Set(submissionList.map((item) => item.campaign_id)),
    ];

    const [campaignResult, rewardResult] = await Promise.all([
      supabase
        .from("campaigns")
        .select("id, title, platform, reward_per_1000")
        .in("id", campaignIds),

      supabase
        .from("submission_rewards")
        .select(
          "submission_id, verified_views, reward_amount, reward_status"
        )
        .in("submission_id", submissionIds),
    ]);

    if (campaignResult.error || rewardResult.error) {
      setError("We couldn't load all your campaign and reward details.");
      setLoading(false);
      return;
    }

    const campaignList = (campaignResult.data || []) as Campaign[];
    const rewardList = (rewardResult.data || []) as Reward[];

    const combined: EarningsRecord[] = submissionList.map((submission) => ({
      submission,
      campaign:
        campaignList.find(
          (campaign) => campaign.id === submission.campaign_id
        ) || null,
      reward:
        rewardList.find(
          (reward) => reward.submission_id === submission.id
        ) || null,
    }));

    setRecords(combined);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const totalViews = records.reduce(
    (sum, record) =>
      sum + Number(record.reward?.verified_views || 0),
    0
  );

  const pending = records
    .filter((record) => record.reward?.reward_status === "pending")
    .reduce(
      (sum, record) =>
        sum + Number(record.reward?.reward_amount || 0),
      0
    );

  const approved = records
    .filter((record) => record.reward?.reward_status === "approved")
    .reduce(
      (sum, record) =>
        sum + Number(record.reward?.reward_amount || 0),
      0
    );

  const paid = records
    .filter((record) => record.reward?.reward_status === "paid")
    .reduce(
      (sum, record) =>
        sum + Number(record.reward?.reward_amount || 0),
      0
    );

  const filteredRecords =
    filter === "all"
      ? records
      : records.filter(
          (record) => record.reward?.reward_status === filter
        );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading your earnings...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <style>{`
        @keyframes earningsEnter {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .earnings-enter {
          animation: earningsEnter .55s ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-violet-300"
            >
              ← Back to dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.09] text-xl text-violet-300">
                ◈
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  My Earnings
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Track your rewards and verified clip performance.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadEarnings}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:border-violet-400/30 hover:bg-violet-400/10 hover:text-white"
          >
            ↻ Refresh earnings
          </button>
        </header>

        {error && (
          <div className="mb-7 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-200">
            {error}
          </div>
        )}

        <section className="earnings-enter mb-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Approved rewards"
            value={money(approved)}
            description="Rewards approved by campaign owners"
            symbol="✓"
            accent="emerald"
          />

          <MetricCard
            label="Pending rewards"
            value={money(pending)}
            description="Awaiting campaign owner review"
            symbol="◷"
            accent="amber"
          />

          <MetricCard
            label="Paid rewards"
            value={money(paid)}
            description="Rewards marked as paid"
            symbol="↗"
            accent="violet"
          />

          <MetricCard
            label="Verified views"
            value={number(totalViews)}
            description="Views recorded for your submissions"
            symbol="◉"
            accent="blue"
          />
        </section>

        <section className="mb-9 rounded-2xl border border-violet-400/15 bg-gradient-to-r from-violet-500/[0.10] via-[#171322] to-[#111019] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
                Reward overview
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {money(approved + pending + paid)}
              </h2>
              <p className="mt-2 max-w-lg text-xs leading-5 text-zinc-400">
                Total rewards recorded across your submissions, including
                pending, approved and paid rewards.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-black/20 px-5 py-4">
              <p className="text-xs text-zinc-500">Submission count</p>
              <p className="mt-1 text-2xl font-black">
                {number(records.length)}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/[0.08] pt-5">
            <p className="text-xs leading-5 text-zinc-400">
              Important: an approved reward is not necessarily a completed
              payment. ClipTN's payout system is not yet available. The
              "Paid" status is shown separately so your records remain clear.
            </p>
          </div>
        </section>

        <section>
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl font-bold">Reward history</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Follow the performance and reward status of each clip.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["all", "pending", "approved", "paid", "rejected"].map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                      filter === item
                        ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                        : "border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-white"
                    }`}
                  >
                    {item === "all" ? "All rewards" : item}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">
                ◈
              </div>

              <h3 className="text-base font-semibold">
                {records.length === 0
                  ? "Your earnings journey starts here"
                  : "No rewards in this category"}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                {records.length === 0
                  ? "Explore active campaigns, create clips and submit your work to start building your earnings history."
                  : "Try another filter to see your other reward records."}
              </p>

              {records.length === 0 && (
                <Link
                  href="/discover-campaigns"
                  className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
                >
                  Explore campaigns →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const { submission, campaign, reward } = record;

                return (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-5 transition hover:border-violet-400/20 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                          Campaign
                        </p>

                        <h3 className="mt-2 break-words text-base font-bold text-white">
                          {campaign?.title || "Campaign"}
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          {campaign?.platform || "Platform"} · Submitted{" "}
                          {formatDate(submission.submitted_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={submission.status} />
                        <StatusBadge
                          status={reward?.reward_status || "pending"}
                        />
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-5 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Verified views
                        </p>
                        <p className="mt-2 text-lg font-bold">
                          {number(Number(reward?.verified_views || 0))}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Reward rate
                        </p>
                        <p className="mt-2 text-lg font-bold">
                          {campaign
                            ? money(Number(campaign.reward_per_1000))
                            : "—"}
                        </p>
                        <p className="mt-1 text-[10px] text-zinc-600">
                          Per 1,000 views
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Calculated reward
                        </p>
                        <p className="mt-2 text-lg font-bold text-violet-300">
                          {money(Number(reward?.reward_amount || 0))}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                          Reward status
                        </p>
                        <div className="mt-2">
                          <StatusBadge
                            status={reward?.reward_status || "pending"}
                          />
                        </div>
                      </div>
                    </div>

                    {submission.review_notes && (
                      <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Review feedback
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          {submission.review_notes}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                      <p className="text-[10px] text-zinc-600">
                        Submission ID: {submission.id.slice(0, 8)}...
                      </p>

                      <Link
                        href="/my-submissions"
                        className="text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                      >
                        View submission details →
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-white/[0.07] pt-6 text-xs text-zinc-600 sm:flex-row">
          <p>© {new Date().getFullYear()} ClipTN. All rights reserved.</p>
          <Link
            href="/dashboard"
            className="transition hover:text-violet-300"
          >
            Back to workspace
          </Link>
        </footer>
      </div>
    </main>
  );
}
