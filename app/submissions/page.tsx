
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "pending" | "under_review" | "approved" | "rejected" | "paid";
type RewardStatus = "pending" | "approved" | "rejected" | "paid";

type Reward = {
  verified_views: number;
  reward_amount: number;
  reward_status: RewardStatus;
};

type Submission = {
  id: string;
  campaign_id: string;
  clipper_id: string;
  clip_url: string;
  platform: string;
  status: Status;
  review_notes: string | null;
  submitted_at: string;
  clipper_name: string;
  campaign_title: string;
  reward_per_1000: number;
  max_reward_per_clipper: number | null;
  budget_total: number;
  reward: Reward;
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
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function formatTND(value: number) {
  return `${Number(value).toFixed(3)} TND`;
}

export default function SubmissionsPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewsInputs, setViewsInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rewardUpdatingId, setRewardUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

      if (profile.role !== "streamer") {
        router.replace("/dashboard");
        return;
      }

      const { data: campaigns, error: campaignError } = await supabase
        .from("campaigns")
        .select(
          "id, title, reward_per_1000, budget_total, max_reward_per_clipper"
        )
        .eq("streamer_id", user.id);

      if (!active) return;

      if (campaignError) {
        console.error(campaignError);
        setError("We couldn't load your campaigns.");
        setLoading(false);
        return;
      }

      if (!campaigns || campaigns.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const campaignIds = campaigns.map((campaign) => campaign.id);

      const { data: submissionRows, error: submissionError } = await supabase
        .from("submissions")
        .select(
          "id, campaign_id, clipper_id, clip_url, platform, status, review_notes, submitted_at"
        )
        .in("campaign_id", campaignIds)
        .order("submitted_at", { ascending: false });

      if (!active) return;

      if (submissionError) {
        console.error(submissionError);
        setError("We couldn't load your submissions.");
        setLoading(false);
        return;
      }

      const rows = submissionRows ?? [];
      const submissionIds = rows.map((item) => item.id);

      let rewardRows: {
        submission_id: string;
        verified_views: number;
        reward_amount: number;
        reward_status: string;
      }[] = [];

      if (submissionIds.length > 0) {
        const { data, error: rewardError } = await supabase
          .from("submission_rewards")
          .select(
            "submission_id, verified_views, reward_amount, reward_status"
          )
          .in("submission_id", submissionIds);

        if (!active) return;

        if (rewardError) {
          console.error(rewardError);
          setError("We couldn't load reward information.");
          setLoading(false);
          return;
        }

        rewardRows = data ?? [];
      }

      const clipperIds = [
        ...new Set(rows.map((item) => item.clipper_id)),
      ];

      let profiles: { id: string; full_name: string }[] = [];

      if (clipperIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clipperIds);

        if (!active) return;

        if (profilesError) {
          console.error(profilesError);
          setError("We couldn't load clipper profile information.");
          setLoading(false);
          return;
        }

        profiles = profileRows ?? [];
      }

      const campaignMap = new Map(
        campaigns.map((campaign) => [campaign.id, campaign])
      );

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile.full_name])
      );

      const rewardMap = new Map(
        rewardRows.map((reward) => [reward.submission_id, reward])
      );

      const formatted: Submission[] = rows.map((item) => {
        const campaign = campaignMap.get(item.campaign_id);
        const reward = rewardMap.get(item.id);

        return {
          ...item,
          status: item.status as Status,
          clipper_name:
            profileMap.get(item.clipper_id) ?? "ClipTN Clipper",
          campaign_title: campaign?.title ?? "Campaign",
          reward_per_1000: Number(campaign?.reward_per_1000 ?? 0),
          max_reward_per_clipper:
            campaign?.max_reward_per_clipper == null
              ? null
              : Number(campaign.max_reward_per_clipper),
          budget_total: Number(campaign?.budget_total ?? 0),
          reward: {
            verified_views: Number(reward?.verified_views ?? 0),
            reward_amount: Number(reward?.reward_amount ?? 0),
            reward_status: (reward?.reward_status ??
              "pending") as RewardStatus,
          },
        };
      });

      if (!active) return;

      setSubmissions(formatted);

      const initialNotes: Record<string, string> = {};
      const initialViews: Record<string, string> = {};

      formatted.forEach((item) => {
        initialNotes[item.id] = item.review_notes ?? "";
        initialViews[item.id] = String(item.reward.verified_views);
      });

      setNotes(initialNotes);
      setViewsInputs(initialViews);
      setLoading(false);
    }

    loadSubmissions();

    return () => {
      active = false;
    };
  }, [router]);

  async function updateSubmission(
    submissionId: string,
    newStatus: Status
  ) {
    setError("");
    setSuccess("");
    setUpdatingId(submissionId);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const submission = submissions.find(
        (item) => item.id === submissionId
      );

      if (!submission) {
        setError("Submission not found. Please refresh the page.");
        return;
      }

      if (submission.status === "paid") {
        setError("Paid submissions cannot be changed here.");
        return;
      }

      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          status: newStatus,
          review_notes: notes[submissionId]?.trim() || null,
        })
        .eq("id", submissionId);

      if (updateError) {
        console.error(updateError);
        setError("We couldn't update this submission. Please try again.");
        return;
      }

      setSubmissions((current) =>
        current.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                status: newStatus,
                review_notes: notes[submissionId]?.trim() || null,
              }
            : item
        )
      );

      setSuccess(`Clip review marked as ${formatStatus(newStatus)}.`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateReward(
    submissionId: string,
    rewardStatus: "pending" | "approved" | "rejected"
  ) {
    setError("");
    setSuccess("");
    setRewardUpdatingId(submissionId);

    try {
      const supabase = createClient();

      const submission = submissions.find(
        (item) => item.id === submissionId
      );

      if (!submission) {
        setError("Submission not found. Please refresh the page.");
        return;
      }

      if (submission.reward.reward_status === "paid") {
        setError("Paid rewards cannot be changed.");
        return;
      }

      const rawViews = viewsInputs[submissionId] ?? "";

      if (!/^\d+$/.test(rawViews)) {
        setError("Enter a valid whole number of verified views.");
        return;
      }

      const verifiedViews = Number(rawViews);

      if (!Number.isSafeInteger(verifiedViews) || verifiedViews < 0) {
        setError("Verified views must be a valid non-negative whole number.");
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "set_submission_reward",
        {
          p_submission_id: submissionId,
          p_verified_views: verifiedViews,
          p_reward_status: rewardStatus,
        }
      );

      if (rpcError) {
        console.error(rpcError);
        setError(rpcError.message || "We couldn't update this reward.");
        return;
      }

      const result = data as {
        verified_views: number;
        reward_amount: number;
        reward_status: RewardStatus;
        remaining_budget: number;
      };

      setSubmissions((current) =>
        current.map((item) =>
          item.id === submissionId
            ? {
                ...item,
                reward: {
                  verified_views: Number(result.verified_views),
                  reward_amount: Number(result.reward_amount),
                  reward_status: result.reward_status,
                },
              }
            : item
        )
      );

      setSuccess(
        rewardStatus === "rejected"
          ? "Reward rejected. No amount has been allocated."
          : rewardStatus === "approved"
            ? `Reward approved: ${formatTND(Number(result.reward_amount))}.`
            : `Reward saved: ${formatTND(Number(result.reward_amount))}.`
      );
    } catch (err) {
      console.error(err);
      setError("Something went wrong while updating the reward.");
    } finally {
      setRewardUpdatingId(null);
    }
  }

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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">Loading submissions...</p>
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
              Creator workspace
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Clip reviews<span className="text-violet-400">.</span>
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              Review submitted clips and manage their rewards.
            </p>
          </div>

          <Link
            href="/my-campaigns"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold text-zinc-300 transition hover:border-violet-400/30 hover:text-white"
          >
            My campaigns →
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

        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
          >
            {success}
          </div>
        )}

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Total clips", value: counts.all },
            { label: "Pending", value: counts.pending },
            { label: "Under review", value: counts.under_review },
            { label: "Approved", value: counts.approved },
            { label: "Rejected", value: counts.rejected },
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

        <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#14121c]">
          <div className="border-b border-white/[0.07] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Submitted clips</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Review clips and manage verified-view rewards.
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
                    ? "No clips submitted yet"
                    : "No submissions in this category"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {submissions.length === 0
                    ? "When clippers submit videos to your campaigns, they'll appear here for review."
                    : "Try selecting another status to see more submissions."}
                </p>
                {submissions.length === 0 && (
                  <Link
                    href="/my-campaigns"
                    className="mt-6 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:bg-violet-500"
                  >
                    View my campaigns
                  </Link>
                )}
              </div>
            ) : (
              filteredSubmissions.map((submission) => {
                const isRewardPaid =
                  submission.reward.reward_status === "paid";
                const views = Number(viewsInputs[submission.id] ?? 0);
                const safeViews =
                  Number.isSafeInteger(views) && views >= 0 ? views : 0;

                const estimatedReward = Math.min(
                  (safeViews / 1000) * submission.reward_per_1000,
                  submission.max_reward_per_clipper ??
                    Number.POSITIVE_INFINITY
                );

                return (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-white/[0.07] bg-[#0d0c14] p-5 transition hover:border-violet-400/20 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle(submission.status)}`}
                          >
                            Clip: {formatStatus(submission.status)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold text-zinc-400">
                            {submission.platform}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold">
                          {submission.campaign_title}
                        </h3>

                        <p className="mt-2 text-sm text-zinc-400">
                          Submitted by{" "}
                          <span className="font-semibold text-white">
                            {submission.clipper_name}
                          </span>
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {formatDate(submission.submitted_at)}
                        </p>
                      </div>

                      <a
                        href={submission.clip_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-xs font-bold text-violet-300 transition hover:border-violet-400/40 hover:bg-violet-500/20"
                      >
                        Watch submitted clip ↗
                      </a>
                    </div>

                    <div className="mt-6 border-t border-white/[0.06] pt-5">
                      <label
                        htmlFor={`notes-${submission.id}`}
                        className="mb-2 block text-xs font-semibold text-zinc-300"
                      >
                        Review notes
                      </label>
                      <textarea
                        id={`notes-${submission.id}`}
                        rows={2}
                        maxLength={1000}
                        disabled={submission.status === "paid"}
                        value={notes[submission.id] ?? ""}
                        onChange={(event) =>
                          setNotes((current) => ({
                            ...current,
                            [submission.id]: event.target.value,
                          }))
                        }
                        placeholder="Leave feedback for the clipper (optional)..."
                        className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#080810] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 disabled:opacity-50"
                      />

                      {submission.status === "paid" ? (
                        <p className="mt-4 text-xs text-violet-300">
                          This submission has been marked as paid.
                        </p>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={updatingId === submission.id}
                            onClick={() =>
                              updateSubmission(submission.id, "under_review")
                            }
                            className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-50"
                          >
                            Under review
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === submission.id}
                            onClick={() =>
                              updateSubmission(submission.id, "approved")
                            }
                            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {updatingId === submission.id
                              ? "Saving..."
                              : "Approve clip"}
                          </button>

                          <button
                            type="button"
                            disabled={updatingId === submission.id}
                            onClick={() =>
                              updateSubmission(submission.id, "rejected")
                            }
                            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                          >
                            Reject clip
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300">
                            Reward management
                          </p>
                          <h4 className="mt-1 text-lg font-bold">
                            Verified views & earnings
                          </h4>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle(submission.reward.reward_status)}`}
                        >
                          Reward: {formatStatus(submission.reward.reward_status)}
                        </span>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-white/[0.06] bg-[#080810] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Reward rate
                          </p>
                          <p className="mt-2 text-lg font-black">
                            {formatTND(submission.reward_per_1000)}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            Per 1,000 views
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-[#080810] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Clipper cap
                          </p>
                          <p className="mt-2 text-lg font-black">
                            {submission.max_reward_per_clipper === null
                              ? "No cap"
                              : formatTND(submission.max_reward_per_clipper)}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            Maximum per clipper
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-[#080810] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Current reward
                          </p>
                          <p className="mt-2 text-lg font-black text-emerald-300">
                            {formatTND(submission.reward.reward_amount)}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-600">
                            Stored in ClipTN
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <label
                          htmlFor={`views-${submission.id}`}
                          className="mb-2 block text-xs font-semibold text-zinc-300"
                        >
                          Verified views
                        </label>
                        <input
                          id={`views-${submission.id}`}
                          type="number"
                          min="0"
                          step="1"
                          disabled={isRewardPaid || rewardUpdatingId === submission.id}
                          value={viewsInputs[submission.id] ?? "0"}
                          onChange={(event) =>
                            setViewsInputs((current) => ({
                              ...current,
                              [submission.id]: event.target.value,
                            }))
                          }
                          placeholder="Enter verified views"
                          className="w-full rounded-xl border border-white/[0.08] bg-[#080810] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 disabled:opacity-50"
                        />

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-zinc-500">
                            Estimated reward before remaining-budget adjustment
                          </span>
                          <span className="font-bold text-violet-300">
                            {formatTND(estimatedReward)}
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] leading-5 text-zinc-600">
                          The final amount is calculated securely by Supabase
                          and may be lower if the campaign budget is nearly
                          exhausted. Only enter views you have actually
                          verified.
                        </p>
                      </div>

                      {isRewardPaid ? (
                        <p className="mt-5 text-xs text-violet-300">
                          This reward has been marked as paid and cannot be
                          changed here.
                        </p>
                      ) : (
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={rewardUpdatingId === submission.id}
                            onClick={() =>
                              updateReward(submission.id, "pending")
                            }
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
                          >
                            {rewardUpdatingId === submission.id
                              ? "Saving..."
                              : "Save reward"}
                          </button>

                          <button
                            type="button"
                            disabled={rewardUpdatingId === submission.id}
                            onClick={() =>
                              updateReward(submission.id, "approved")
                            }
                            className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
                          >
                            Approve reward
                          </button>

                          <button
                            type="button"
                            disabled={rewardUpdatingId === submission.id}
                            onClick={() =>
                              updateReward(submission.id, "rejected")
                            }
                            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-400/20 disabled:opacity-50"
                          >
                            Reject reward
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })
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
