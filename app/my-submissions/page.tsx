
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "paid";

type RewardStatus = "pending" | "approved" | "rejected" | "paid";

type Submission = {
  id: string;
  campaign_id: string;
  clip_url: string;
  platform: string;
  status: Status;
  review_notes: string | null;
  submitted_at: string;
  campaign_title: string;
  reward_per_1000: number;
  verified_views: number;
  reward_amount: number;
  reward_status: RewardStatus;
};

const filters = [
  "all",
  "pending",
  "under_review",
  "approved",
  "rejected",
  "paid",
] as const;

type Filter = (typeof filters)[number];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value));
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function statusStyle(status: string) {
  switch (status) {
    case "approved":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "rejected":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "paid":
      return "border-violet-400/20 bg-violet-400/10 text-violet-300";
    case "under_review":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    default:
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }
}

function getRewardDescription(status: RewardStatus) {
  switch (status) {
    case "approved":
      return "Your reward has been approved. Payment has not yet been marked as settled.";
    case "paid":
      return "This reward has been marked as paid.";
    case "rejected":
      return "This reward was rejected by the campaign creator.";
    default:
      return "Your reward is waiting for verification and review.";
  }
}

export default function MySubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSubmissions() {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const user = authData.user;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (profileError || !profile) {
        setError("We couldn't verify your account.");
        setLoading(false);
        return;
      }

      if (profile.role !== "clipper") {
        router.replace("/dashboard");
        return;
      }

      const { data: submissionRows, error: submissionError } =
        await supabase
          .from("submissions")
          .select(
            "id, campaign_id, clip_url, platform, status, review_notes, submitted_at"
          )
          .eq("clipper_id", user.id)
          .order("submitted_at", { ascending: false });

      if (!active) return;

      if (submissionError) {
        console.error(submissionError);
        setError("We couldn't load your submissions.");
        setLoading(false);
        return;
      }

      const submissionIds = (submissionRows ?? []).map(
        (item) => item.id
      );

      const campaignIds = [
        ...new Set((submissionRows ?? []).map((item) => item.campaign_id)),
      ];

      let campaigns: {
        id: string;
        title: string;
        reward_per_1000: number;
      }[] = [];

      if (campaignIds.length > 0) {
        const { data: campaignRows, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, title, reward_per_1000")
          .in("id", campaignIds);

        if (!active) return;

        if (campaignError) {
          console.error(campaignError);
          setError("We couldn't load campaign information.");
          setLoading(false);
          return;
        }

        campaigns = campaignRows ?? [];
      }

      let rewardRows: {
        submission_id: string;
        verified_views: number | string;
        reward_amount: number | string;
        reward_status: RewardStatus;
      }[] = [];

      if (submissionIds.length > 0) {
        const { data: rewards, error: rewardError } = await supabase
          .from("submission_rewards")
          .select(
            "submission_id, verified_views, reward_amount, reward_status"
          )
          .in("submission_id", submissionIds);

        if (!active) return;

        if (rewardError) {
          console.error(rewardError);
          setError(
            "Your clips loaded, but we couldn't load your reward information."
          );
        } else {
          rewardRows = rewards ?? [];
        }
      }

      const campaignMap = new Map(
        campaigns.map((campaign) => [
          campaign.id,
          {
            title: campaign.title,
            reward: Number(campaign.reward_per_1000),
          },
        ])
      );

      const rewardMap = new Map(
        rewardRows.map((reward) => [
          reward.submission_id,
          {
            verified_views: Number(reward.verified_views ?? 0),
            reward_amount: Number(reward.reward_amount ?? 0),
            reward_status: reward.reward_status,
          },
        ])
      );

      const formatted: Submission[] = (submissionRows ?? []).map((item) => {
        const campaign = campaignMap.get(item.campaign_id);
        const reward = rewardMap.get(item.id);

        return {
          ...item,
          status: item.status as Status,
          campaign_title: campaign?.title ?? "Campaign",
          reward_per_1000: campaign?.reward ?? 0,
          verified_views: reward?.verified_views ?? 0,
          reward_amount: reward?.reward_amount ?? 0,
          reward_status: reward?.reward_status ?? "pending",
        };
      });

      if (!active) return;

      setSubmissions(formatted);
      setLoading(false);
    }

    loadSubmissions();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredSubmissions = useMemo(() => {
    if (filter === "all") return submissions;
    return submissions.filter((item) => item.status === filter);
  }, [submissions, filter]);

  const counts = useMemo(() => {
    return {
      all: submissions.length,
      pending: submissions.filter((item) => item.status === "pending").length,
      under_review: submissions.filter(
        (item) => item.status === "under_review"
      ).length,
      approved: submissions.filter((item) => item.status === "approved").length,
      rejected: submissions.filter((item) => item.status === "rejected").length,
      paid: submissions.filter((item) => item.status === "paid").length,
    };
  }, [submissions]);

  const earnings = useMemo(() => {
    return {
      approved: submissions
        .filter((item) => item.reward_status === "approved")
        .reduce((total, item) => total + item.reward_amount, 0),

      pending: submissions
        .filter((item) => item.reward_status === "pending")
        .reduce((total, item) => total + item.reward_amount, 0),

      paid: submissions
        .filter((item) => item.reward_status === "paid")
        .reduce((total, item) => total + item.reward_amount, 0),

      views: submissions.reduce(
        (total, item) => total + item.verified_views,
        0
      ),
    };
  }, [submissions]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">Loading your submissions...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-violet-700/[0.12] blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-fuchsia-700/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] pb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 transition hover:text-violet-300"
            >
              ← Back to dashboard
            </Link>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Clipper workspace
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              My submissions<span className="text-violet-400">.</span>
            </h1>

            <p className="mt-3 text-sm text-zinc-400">
              Track your clips, verified views, and earnings.
            </p>
          </div>

          <Link
            href="/discover-campaigns"
            className="rounded-xl bg-violet-600 px-5 py-3 text-xs font-bold transition hover:-translate-y-0.5 hover:bg-violet-500"
          >
            Discover campaigns →
          </Link>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total clips", value: counts.all },
            { label: "Pending", value: counts.pending },
            { label: "Under review", value: counts.under_review },
            { label: "Approved", value: counts.approved },
            { label: "Paid", value: counts.paid },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black">{item.value}</p>
            </div>
          ))}
        </section>

        {/* Earnings overview */}
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Your earnings
            </p>
            <h2 className="mt-2 text-xl font-black">Earnings overview</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Your reward figures are based on creator-verified views and reward decisions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-400/15 bg-[#14121c] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Approved earnings
              </p>
              <p className="mt-3 text-2xl font-black text-emerald-300">
                {formatMoney(earnings.approved)}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">TND · Not yet paid</p>
            </div>

            <div className="rounded-2xl border border-amber-400/15 bg-[#14121c] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Pending rewards
              </p>
              <p className="mt-3 text-2xl font-black text-amber-300">
                {formatMoney(earnings.pending)}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">TND · Awaiting review</p>
            </div>

            <div className="rounded-2xl border border-violet-400/15 bg-[#14121c] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Paid rewards
              </p>
              <p className="mt-3 text-2xl font-black text-violet-300">
                {formatMoney(earnings.paid)}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">TND · Marked as paid</p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Verified views
              </p>
              <p className="mt-3 text-2xl font-black text-white">
                {earnings.views.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">Across your clips</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#14121c]">
          <div className="border-b border-white/[0.07] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Your submitted clips</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Follow each submission from review to payment.
                </p>
              </div>

              <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-300">
                {filteredSubmissions.length} shown
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold capitalize transition ${
                    filter === item
                      ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
                      : "border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item === "all" ? "All" : formatStatus(item)}
                  <span className="ml-2 opacity-60">{counts[item]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0c14] px-6 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                  ✦
                </div>

                <h3 className="mt-5 text-lg font-bold">
                  {submissions.length === 0
                    ? "You haven't submitted any clips yet"
                    : "No clips in this category"}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {submissions.length === 0
                    ? "Find a campaign, create your clip, publish it and submit its link. Your progress will appear here."
                    : "Try selecting another status to see your other submissions."}
                </p>

                {submissions.length === 0 && (
                  <Link
                    href="/discover-campaigns"
                    className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"
                  >
                    Explore campaigns
                  </Link>
                )}
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-white/[0.07] bg-[#0d0c14] p-5 transition hover:border-violet-400/20 sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle(submission.status)}`}
                        >
                          Clip: {formatStatus(submission.status)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle(submission.reward_status)}`}
                        >
                          Reward: {formatStatus(submission.reward_status)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold text-zinc-400">
                          {submission.platform}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold">
                        {submission.campaign_title}
                      </h3>

                      <p className="mt-2 text-xs text-zinc-500">
                        Submitted {formatDate(submission.submitted_at)}
                      </p>
                    </div>

                    <a
                      href={submission.clip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-xs font-bold text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-500/20"
                    >
                      Open my clip ↗
                    </a>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Reward rate
                      </p>
                      <p className="mt-2 text-xl font-black text-violet-300">
                        {formatMoney(submission.reward_per_1000)} TND
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Per 1,000 qualified views
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Verified views
                      </p>
                      <p className="mt-2 text-xl font-black">
                        {submission.verified_views.toLocaleString("en-US")}
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Views verified by creator
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Calculated reward
                      </p>
                      <p className="mt-2 text-xl font-black text-emerald-300">
                        {formatMoney(submission.reward_amount)} TND
                      </p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Current recorded reward
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        Reward status
                      </p>
                      <p className="mt-2 text-sm font-bold">
                        {formatStatus(submission.reward_status)}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                        {getRewardDescription(submission.reward_status)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Submission review
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {formatStatus(submission.status)}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-600">
                      {submission.status === "paid"
                        ? "The clip submission is marked as paid."
                        : submission.status === "approved"
                          ? "The clip has been approved by the creator."
                          : submission.status === "rejected"
                            ? "The clip submission was not accepted."
                            : "The clip is waiting for the review process."}
                    </p>
                  </div>

                  {submission.review_notes && (
                    <div className="mt-5 rounded-xl border border-violet-400/10 bg-violet-500/[0.05] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
                        Feedback from creator
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                        {submission.review_notes}
                      </p>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
