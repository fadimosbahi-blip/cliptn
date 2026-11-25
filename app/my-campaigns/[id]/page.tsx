
"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  max_reward_per_clipper: number | null;
  currency: string;
  starts_at: string;
  ends_at: string;
  status: string;
  created_at: string;
};

type Submission = {
  id: string;
  clip_url: string;
  platform: string;
  status: string;
  review_notes: string | null;
  submitted_at: string;
};

type Reward = {
  submission_id: string;
  verified_views: number;
  reward_amount: number;
  reward_status: string;
};

type BudgetSummary = {
  allocated_rewards: number;
  remaining_budget: number;
  total_verified_views: number;
  total_submissions: number;
};

function money(value: number) {
  return new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);
}

function date(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function statusStyle(status: string) {
  switch (status) {
    case "active":
    case "approved":
    case "paid":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "rejected":
    case "closed":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "pending":
    case "pending_approval":
    case "under_review":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    case "completed":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

function readableStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
    letter.toUpperCase()
  );
}

function MyCampaignDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const campaignId = params.id;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!active) return;

        if (profileError || !profile) {
          setError("We couldn't verify your account.");
          return;
        }

        if (profile.role !== "streamer") {
          router.replace("/dashboard");
          return;
        }

        // Load only a campaign owned by this streamer.
        const { data: campaignData, error: campaignError } =
          await supabase
            .from("campaigns")
            .select(
              "id, title, description, platform, source_url, cover_image_url, budget_total, reward_per_1000, max_reward_per_clipper, currency, starts_at, ends_at, status, created_at"
            )
            .eq("id", campaignId)
            .eq("streamer_id", user.id)
            .maybeSingle();

        if (!active) return;

        if (campaignError || !campaignData) {
          setError("Campaign not found, or you don't have access to it.");
          return;
        }

        setCampaign(campaignData as Campaign);

        // Load submissions received by this campaign.
        const { data: submissionData, error: submissionError } =
          await supabase
            .from("submissions")
            .select(
              "id, clip_url, platform, status, review_notes, submitted_at"
            )
            .eq("campaign_id", campaignId)
            .order("submitted_at", { ascending: false });

        if (!active) return;

        if (submissionError) {
          console.error("Submission loading error:", submissionError);
          setError("Campaign loaded, but submissions couldn't be loaded.");
          return;
        }

        const loadedSubmissions =
          (submissionData || []) as Submission[];

        setSubmissions(loadedSubmissions);

        // Load reward information for the submissions.
        if (loadedSubmissions.length > 0) {
          const submissionIds = loadedSubmissions.map((item) => item.id);

          const { data: rewardData, error: rewardError } = await supabase
            .from("submission_rewards")
            .select(
              "submission_id, verified_views, reward_amount, reward_status"
            )
            .in("submission_id", submissionIds);

          if (!active) return;

          if (rewardError) {
            console.error("Reward loading error:", rewardError);
          } else {
            setRewards((rewardData || []) as Reward[]);
          }
        }

        // Load the campaign's budget summary.
        const { data: budgetData, error: budgetError } = await supabase
          .from("campaign_budget_summary")
          .select(
            "allocated_rewards, remaining_budget, total_verified_views, total_submissions"
          )
          .eq("campaign_id", campaignId)
          .maybeSingle();

        if (!active) return;

        if (budgetError) {
          console.error("Budget summary error:", budgetError);
        } else if (budgetData) {
          setBudget(budgetData as BudgetSummary);
        }
      } catch (err) {
        console.error("Campaign details error:", err);

        if (active) {
          setError("Something went wrong while loading this campaign.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (campaignId) {
      loadPage();
    }

    return () => {
      active = false;
    };
  }, [campaignId, router]);

  // Submit a draft campaign for admin approval.
  async function handleSubmitForApproval() {
    if (!campaign || campaign.status !== "draft" || submitting) {
      return;
    }

    const confirmed = window.confirm(
      "Submit this campaign for admin approval? You will no longer be able to edit it unless an admin returns it to draft."
    );

    if (!confirmed) return;

    setSubmitting(true);
    setSubmissionMessage("");
    setSubmissionError("");

    try {
      const supabase = createClient();

      const { data, error: submitError } = await supabase.rpc(
        "submit_my_campaign_for_approval",
        {
          p_campaign_id: campaign.id,
        }
      );

      if (submitError) {
        throw submitError;
      }

      if (!data?.success || data.status !== "pending_approval") {
        throw new Error(
          "The campaign submission could not be confirmed. Please refresh and try again."
        );
      }

      setCampaign((current) =>
        current
          ? {
              ...current,
              status: "pending_approval",
            }
          : current
      );

      setSubmissionMessage(
        "Your campaign has been submitted successfully. It is now waiting for admin approval."
      );
    } catch (err) {
      console.error("Campaign submission error:", err);

      setSubmissionError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your campaign."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const rewardFor = (submissionId: string) =>
    rewards.find((reward) => reward.submission_id === submissionId);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading your campaign...
          </p>
        </div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#14121c] p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-300">
            !
          </div>

          <h1 className="text-xl font-bold">Campaign unavailable</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {error || "We couldn't find this campaign."}
          </p>

          <Link
            href="/my-campaigns"
            className="mt-7 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
          >
            Back to my campaigns
          </Link>
        </div>
      </main>
    );
  }

  const allocated = Number(budget?.allocated_rewards ?? 0);

  const remaining = Number(
    budget?.remaining_budget ?? campaign.budget_total
  );

  const utilization =
    campaign.budget_total > 0
      ? Math.min(
          (allocated / Number(campaign.budget_total)) * 100,
          100
        )
      : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-7 text-white sm:px-8 lg:px-12">
      <style>{`
        @keyframes campaignGlow {
          0%, 100% { opacity: .2; transform: scale(1); }
          50% { opacity: .4; transform: scale(1.12); }
        }

        @keyframes campaignEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .campaign-glow {
          animation: campaignGlow 9s ease-in-out infinite;
        }

        .campaign-enter {
          animation: campaignEnter .5s ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="campaign-glow pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-indigo-700/[0.08] blur-[120px]" />

      <div className="relative mx-auto max-w-6xl">
        {/* HEADER */}
        <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/my-campaigns"
              className="text-xs text-zinc-500 transition hover:text-violet-300"
            >
              ← Back to my campaigns
            </Link>

            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Campaign management
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Campaign overview<span className="text-violet-400">.</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            {campaign.status === "draft" && (
              <>
                <Link
                  href={`/my-campaigns/${campaign.id}/edit`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-violet-500"
                >
                  <span>✎</span>
                  Edit campaign
                </Link>

                <button
                  type="button"
                  onClick={handleSubmitForApproval}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit for approval"}
                </button>
              </>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-violet-400/30 hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </header>

        {/* SUBMISSION FEEDBACK */}
        {(submissionMessage || submissionError) && (
          <div
            role="status"
            className={`mb-6 rounded-2xl border p-4 text-sm leading-6 ${
              submissionError
                ? "border-red-400/20 bg-red-400/10 text-red-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            }`}
          >
            {submissionError || submissionMessage}
          </div>
        )}

        {/* CAMPAIGN STATUS INFORMATION */}
        {campaign.status === "pending_approval" && (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
            <p className="font-bold text-amber-300">
              Campaign awaiting approval
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Your campaign has been submitted and is waiting for an
              administrator to review it. You cannot edit its details while
              it is awaiting approval.
            </p>
          </div>
        )}

        {campaign.status === "active" && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
            <p className="font-bold text-emerald-300">
              Your campaign is active
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Your campaign has been approved and is visible to clippers.
              Its details are locked while it is active.
            </p>
          </div>
        )}

        {campaign.status === "draft" && (
          <div className="mb-6 rounded-2xl border border-violet-400/20 bg-violet-500/[0.05] p-5">
            <p className="font-bold text-violet-300">
              Campaign is a draft
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              You can still edit your campaign details and financial terms.
              When everything is ready, submit it for admin approval.
            </p>
          </div>
        )}

        {campaign.status === "completed" && (
          <div className="mb-6 rounded-2xl border border-blue-400/20 bg-blue-400/[0.06] p-5">
            <p className="font-bold text-blue-300">
              Campaign completed
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This campaign has been completed and its details can no
              longer be edited.
            </p>
          </div>
        )}

        {/* CAMPAIGN HERO */}
        <section className="campaign-enter mb-6 overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#14121c]">
          <div className="relative h-56 overflow-hidden sm:h-72">
            {campaign.cover_image_url ? (
              <img
                src={campaign.cover_image_url}
                alt={campaign.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#392257] via-[#211833] to-[#10101a]">
                <span className="text-8xl font-black text-white/15">
                  {campaign.platform === "TikTok"
                    ? "♪"
                    : campaign.platform === "YouTube"
                    ? "▶"
                    : "◎"}
                </span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#14121c] via-[#14121c]/20 to-black/20" />

            <div className="absolute left-6 top-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-violet-400/20 bg-black/40 px-3 py-1.5 text-[10px] font-bold text-violet-200 backdrop-blur-md">
                {campaign.platform}
              </span>

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold backdrop-blur-md ${statusStyle(campaign.status)}`}
              >
                {readableStatus(campaign.status)}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                Your campaign
              </p>

              <h2 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                {campaign.title}
                <span className="text-violet-400">.</span>
              </h2>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-zinc-400">
              {campaign.description}
            </p>

            <a
              href={campaign.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-violet-400/30 hover:text-white"
            >
              View original content ↗
            </a>
          </div>
        </section>

        {/* BUDGET METRICS */}
        <section className="campaign-enter grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Total budget
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums">
              {money(Number(campaign.budget_total))}
              <span className="ml-1 text-xs font-semibold text-zinc-500">
                TND
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Allocated rewards
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums text-violet-300">
              {money(allocated)}
              <span className="ml-1 text-xs font-semibold text-zinc-500">
                TND
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Remaining budget
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums text-emerald-300">
              {money(remaining)}
              <span className="ml-1 text-xs font-semibold text-zinc-500">
                TND
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Submissions
            </p>
            <p className="mt-4 text-2xl font-black tabular-nums">
              {submissions.length}
            </p>
          </div>
        </section>

        {/* BUDGET PROGRESS */}
        <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#14121c] p-6 sm:p-7">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Campaign budget usage</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Rewards currently allocated against your campaign budget
              </p>
            </div>

            <p className="text-lg font-black tabular-nums text-violet-300">
              {utilization.toFixed(1)}%
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-700"
              style={{ width: `${utilization}%` }}
            />
          </div>

          <div className="mt-3 flex justify-between gap-3 text-xs text-zinc-500">
            <span>{money(allocated)} TND allocated</span>
            <span>{money(Number(campaign.budget_total))} TND total</span>
          </div>
        </section>

        {/* CAMPAIGN SETTINGS */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-6">
            <h2 className="font-bold">Reward configuration</h2>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-500">
                  Reward per 1,000 views
                </span>
                <span className="text-sm font-bold text-violet-300">
                  {money(Number(campaign.reward_per_1000))} TND
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-500">
                  Maximum per clipper
                </span>
                <span className="text-sm font-bold">
                  {campaign.max_reward_per_clipper
                    ? `${money(Number(campaign.max_reward_per_clipper))} TND`
                    : "No cap"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-zinc-500">
                  Currency
                </span>
                <span className="text-sm font-bold">
                  {campaign.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-6">
            <h2 className="font-bold">Campaign timeline</h2>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs text-zinc-500">Start date</p>
                <p className="mt-1 text-sm font-semibold">
                  {date(campaign.starts_at)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">End date</p>
                <p className="mt-1 text-sm font-semibold">
                  {date(campaign.ends_at)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Created</p>
                <p className="mt-1 text-sm font-semibold">
                  {date(campaign.created_at)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SUBMISSIONS */}
        <section className="mt-10">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
                Community activity
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Clip submissions<span className="text-violet-400">.</span>
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Review the clips submitted to this campaign.
              </p>
            </div>

            <Link
              href="/submissions"
              className="text-sm font-semibold text-violet-300 transition hover:text-violet-200"
            >
              Open submission manager →
            </Link>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#14121c]/60 px-6 py-14 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">
                ◇
              </div>

              <h3 className="font-bold">No submissions yet</h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                When clippers submit videos to your campaign, you'll find
                them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((item) => {
                const reward = rewardFor(item.id);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5 transition hover:border-violet-400/20 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold">
                            Clip submission
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyle(item.status)}`}
                          >
                            {readableStatus(item.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-zinc-500">
                          Submitted {date(item.submitted_at)}
                        </p>

                        <a
                          href={item.clip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 block break-all text-sm text-violet-300 underline decoration-violet-300/30 underline-offset-4 transition hover:text-violet-200"
                        >
                          View submitted clip ↗
                        </a>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold text-zinc-400">
                          {item.platform}
                        </span>

                        {reward && (
                          <span
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${statusStyle(reward.reward_status)}`}
                          >
                            Reward: {readableStatus(reward.reward_status)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                          Verified views
                        </p>
                        <p className="mt-2 text-lg font-black tabular-nums">
                          {Number(reward?.verified_views ?? 0).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                          Reward amount
                        </p>
                        <p className="mt-2 text-lg font-black tabular-nums text-violet-300">
                          {money(Number(reward?.reward_amount ?? 0))}
                          <span className="ml-1 text-xs text-zinc-500">
                            TND
                          </span>
                        </p>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                          Reward status
                        </p>
                        <p className="mt-2 text-sm font-bold">
                          {reward
                            ? readableStatus(reward.reward_status)
                            : "Awaiting reward record"}
                        </p>
                      </div>
                    </div>

                    {item.review_notes && (
                      <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Review notes
                        </p>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {item.review_notes}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <div className="mt-10 rounded-2xl border border-violet-400/10 bg-violet-500/[0.04] p-5">
          <p className="text-xs leading-6 text-zinc-400">
            Reward amounts and verified views are displayed from the
            campaign reward records. An approved reward does not mean
            payment has been completed. Payment status is tracked separately.
          </p>
        </div>

        <footer className="mt-10 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
          © 2026 ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}

export default function MyCampaignDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
          <div className="text-center">
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
            <p className="text-sm text-zinc-400">
              Loading your campaign...
            </p>
          </div>
        </main>
      }
    >
      <MyCampaignDetailsContent />
    </Suspense>
  );
}
