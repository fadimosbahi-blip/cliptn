
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PendingCampaign = {
  campaign_id: string;
  streamer_id: string;
  streamer_name: string;
  title: string;
  description: string;
  platform: string;
  source_url: string;
  budget_total: number;
  reward_per_1000: number;
  currency: string;
  max_reward_per_clipper: number | null;
  starts_at: string;
  ends_at: string;
  rights_confirmed: boolean;
  created_at: string;
  cover_image_url: string | null;
};

type ReviewDecision = "approve" | "return_to_draft";

export default function AdminCampaignsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [campaigns, setCampaigns] = useState<PendingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error: requestError } = await supabase.rpc(
      "admin_get_pending_campaigns"
    );

    if (requestError) {
      setError(
        requestError.message.includes("Administrator access required")
          ? "You do not have administrator access to this page."
          : requestError.message
      );
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setCampaigns((data ?? []) as PendingCampaign[]);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  async function reviewCampaign(
    campaign: PendingCampaign,
    decision: ReviewDecision
  ) {
    const isApproval = decision === "approve";

    const confirmed = window.confirm(
      isApproval
        ? `Approve "${campaign.title}" and activate it? Streamers will be able to receive submissions for this campaign.`
        : `Return "${campaign.title}" to Draft? The streamer will be able to edit and resubmit it.`
    );

    if (!confirmed) return;

    setProcessingId(campaign.campaign_id);
    setError("");
    setSuccess("");

    const { data, error: reviewError } = await supabase.rpc(
      "admin_review_campaign",
      {
        p_campaign_id: campaign.campaign_id,
        p_decision: decision,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
      setProcessingId(null);
      return;
    }

    if (!data?.success) {
      setError("The campaign review could not be completed.");
      setProcessingId(null);
      return;
    }

    setSuccess(
      isApproval
        ? `"${campaign.title}" has been approved and activated.`
        : `"${campaign.title}" has been returned to Draft.`
    );

    setCampaigns((previous) =>
      previous.filter(
        (item) => item.campaign_id !== campaign.campaign_id
      )
    );

    setProcessingId(null);
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const query = search.trim().toLowerCase();

    return (
      campaign.title.toLowerCase().includes(query) ||
      campaign.streamer_name.toLowerCase().includes(query) ||
      campaign.platform.toLowerCase().includes(query)
    );
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 2,
    }).format(Number(amount));

  return (
    <main className="min-h-screen bg-[#08080d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-5 py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 transition hover:text-white"
            >
              ← Back to dashboard
            </Link>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
                ClipTN Administration
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Campaign Review
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Review campaign details and financial terms before
                approving them for the ClipTN marketplace.
              </p>
            </div>
          </div>

          <Link
            href="/admin/verifications"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-gray-300 transition hover:border-violet-500/30 hover:text-white"
          >
            Verification Requests →
          </Link>
        </header>

        {/* Feedback */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Queue summary */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Awaiting review
            </p>

            <p className="mt-2 text-3xl font-bold">
              {loading ? "—" : campaigns.length}
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Campaigns requiring administrator action
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Review system
            </p>

            <p className="mt-2 text-lg font-bold text-violet-300">
              Administrator only
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Decisions are validated by the database
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Approval queue</h2>
            <p className="mt-1 text-xs text-gray-500">
              Inspect every campaign before approving it.
            </p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaign, streamer or platform..."
            className="w-full rounded-xl border border-white/10 bg-[#111119] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/50 sm:max-w-sm"
          />
        </section>

        {/* Campaign queue */}
        {loading ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] py-20 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
            <p className="text-sm text-gray-400">
              Loading pending campaigns...
            </p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] px-6 py-20 text-center">
            <div className="mb-4 text-4xl">◇</div>

            <h3 className="text-lg font-semibold">
              {campaigns.length === 0
                ? "No pending campaigns"
                : "No matching campaigns"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {campaigns.length === 0
                ? "New campaign submissions will appear here when streamers request approval."
                : "Try searching with another campaign title, streamer or platform."}
            </p>

            <button
              onClick={loadCampaigns}
              className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
            >
              Refresh queue
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredCampaigns.map((campaign) => (
              <article
                key={campaign.campaign_id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111119] transition hover:border-violet-500/25"
              >
                {/* Campaign heading */}
                <div className="border-b border-white/[0.06] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">
                          {campaign.title}
                        </h3>

                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                          Pending review
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        By {campaign.streamer_name} · {campaign.platform} ·
                        Submitted {formatDate(campaign.created_at)}
                      </p>

                      <p className="mt-1 break-all text-[10px] text-gray-600">
                        Campaign ID: {campaign.campaign_id}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">
                        Total budget
                      </p>

                      <p className="mt-1 text-xl font-bold text-white">
                        {formatMoney(
                          campaign.budget_total,
                          campaign.currency
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
                  {/* Campaign details */}
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">
                      Campaign information
                    </h4>

                    {campaign.cover_image_url && (
                      <div className="mb-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/20">
                        <img
                          src={campaign.cover_image_url}
                          alt={`${campaign.title} cover`}
                          className="max-h-52 w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                        Description
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
                        {campaign.description}
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-3">
                        <span className="text-xs text-gray-400">
                          Platform
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {campaign.platform}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-3">
                        <span className="text-xs text-gray-400">
                          Starts
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {formatDate(campaign.starts_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-3">
                        <span className="text-xs text-gray-400">
                          Ends
                        </span>
                        <span className="text-xs font-semibold text-white">
                          {formatDate(campaign.ends_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] p-3">
                        <span className="text-xs text-gray-400">
                          Rights confirmed
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            campaign.rights_confirmed
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {campaign.rights_confirmed ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>

                    <a
                      href={campaign.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-4 transition hover:bg-violet-500/10"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-violet-300">
                          Open original source ↗
                        </p>
                        <p className="mt-1 break-all text-[11px] text-gray-500">
                          {campaign.source_url}
                        </p>
                      </div>
                      <span className="text-xl text-violet-400">↗</span>
                    </a>
                  </div>

                  {/* Financial terms and review */}
                  <div>
                    <h4 className="mb-4 text-sm font-semibold">
                      Financial terms and administrator review
                    </h4>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Total campaign budget
                        </p>
                        <p className="mt-2 text-2xl font-bold">
                          {formatMoney(
                            campaign.budget_total,
                            campaign.currency
                          )}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[10px] leading-4 text-gray-500">
                            Reward per 1,000 views
                          </p>
                          <p className="mt-2 text-lg font-bold text-violet-300">
                            {formatMoney(
                              campaign.reward_per_1000,
                              campaign.currency
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                          <p className="text-[10px] leading-4 text-gray-500">
                            Maximum per clipper
                          </p>
                          <p className="mt-2 text-lg font-bold">
                            {campaign.max_reward_per_clipper == null
                              ? "No limit"
                              : formatMoney(
                                  campaign.max_reward_per_clipper,
                                  campaign.currency
                                )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                      <p className="text-xs font-semibold text-gray-300">
                        Administrator checklist
                      </p>

                      <ul className="mt-3 space-y-2 text-xs text-gray-400">
                        <li>
                          • Inspect the original source and confirm it is accessible.
                        </li>
                        <li>
                          • Review the campaign description and platform.
                        </li>
                        <li>
                          • Check that the financial terms are reasonable and clear.
                        </li>
                        <li>
                          • Verify the streamer has confirmed content rights.
                        </li>
                        <li>
                          • Check the campaign dates before activation.
                        </li>
                      </ul>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={() =>
                          reviewCampaign(campaign, "approve")
                        }
                        disabled={processingId === campaign.campaign_id}
                        className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processingId === campaign.campaign_id
                          ? "Processing..."
                          : "✓ Approve & Activate"}
                      </button>

                      <button
                        onClick={() =>
                          reviewCampaign(campaign, "return_to_draft")
                        }
                        disabled={processingId === campaign.campaign_id}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Return to Draft
                      </button>
                    </div>

                    <p className="mt-3 text-[10px] leading-5 text-gray-600">
                      Approval activates the campaign in the marketplace.
                      Returning it to Draft allows the streamer to edit and
                      submit it again. Both decisions require administrator
                      authorization from the database.
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-12 border-t border-white/[0.06] py-6 text-center">
          <p className="text-xs text-gray-600">
            ClipTN Administration · Secure campaign management
          </p>
        </footer>
      </div>
    </main>
  );
}
