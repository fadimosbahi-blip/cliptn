
"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  starts_at: string;
  ends_at: string;
  created_at: string;
};

type Submission = {
  id: string;
  clip_url: string;
  status: string;
  submitted_at: string;
};

const platformColors: Record<string, string> = {
  TikTok: "bg-pink-500/10 text-pink-300 border-pink-500/20",
  YouTube: "bg-red-500/10 text-red-300 border-red-500/20",
  Instagram: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

function CampaignDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const supabase = createClient();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCampaign() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || profile.role !== "clipper") {
        router.push("/dashboard");
        return;
      }

      const { data, error: campaignError } = await supabase
        .from("campaigns")
        .select(
          "id, title, description, platform, source_url, cover_image_url, budget_total, reward_per_1000, max_reward_per_clipper, starts_at, ends_at, created_at"
        )
        .eq("id", campaignId)
        .eq("status", "active")
        .maybeSingle();

      if (campaignError || !data) {
        setError(
          "This campaign is unavailable. It may have ended or is no longer active."
        );
        setLoading(false);
        return;
      }

      setCampaign(data as Campaign);

      const { data: existingSubmission } = await supabase
        .from("submissions")
        .select("id, clip_url, status, submitted_at")
        .eq("campaign_id", campaignId)
        .eq("clipper_id", user.id)
        .maybeSingle();

      if (existingSubmission) {
        setSubmission(existingSubmission as Submission);
      }

      setLoading(false);
    }

    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!campaign) return;

    const trimmedUrl = clipUrl.trim();

    try {
      const parsedUrl = new URL(trimmedUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid URL");
      }
    } catch {
      setError("Please enter a valid public video URL.");
      return;
    }

    const now = new Date();
    const start = new Date(campaign.starts_at);
    const end = new Date(campaign.ends_at);

    if (now < start || now >= end) {
      setError("This campaign is not currently accepting submissions.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: submissionError } = await supabase
      .from("submissions")
      .insert({
        campaign_id: campaign.id,
        clipper_id: user.id,
        clip_url: trimmedUrl,
        platform: campaign.platform,
      })
      .select("id, clip_url, status, submitted_at")
      .single();

    if (submissionError) {
      if (submissionError.code === "23505") {
        setError("You've already submitted a clip to this campaign.");
      } else {
        setError(submissionError.message);
      }

      setSubmitting(false);
      return;
    }

    setSubmission(data as Submission);
    setClipUrl("");
    setMessage("Your clip has been submitted successfully!");
    setSubmitting(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading campaign...</p>
        </div>
      </main>
    );
  }

  if (error && !campaign) {
    return (
      <main className="min-h-screen bg-[#09090f] text-white px-6 py-20">
        <div className="max-w-xl mx-auto text-center border border-white/10 bg-white/[0.03] rounded-3xl p-10">
          <div className="text-4xl mb-5">⚠️</div>
          <h1 className="text-2xl font-bold mb-3">Campaign unavailable</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <Link
            href="/discover-campaigns"
            className="inline-block bg-violet-600 hover:bg-violet-500 px-6 py-3 rounded-xl font-semibold transition"
          >
            Back to campaigns
          </Link>
        </div>
      </main>
    );
  }

  if (!campaign) return null;

  const isActive =
    new Date() >= new Date(campaign.starts_at) &&
    new Date() < new Date(campaign.ends_at);

  return (
    <main className="min-h-screen bg-[#09090f] text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        <Link
          href="/discover-campaigns"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8"
        >
          ← Back to Discover
        </Link>

        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8">
          {/* LEFT COLUMN */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#15131f] aspect-video">
              {campaign.cover_image_url ? (
                <img
                  src={campaign.cover_image_url}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950 via-[#171426] to-[#09090f]">
                  <span className="text-7xl">🎬</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-5 left-5">
                <span
                  className={`px-3 py-1 rounded-full text-xs border ${
                    platformColors[campaign.platform] ||
                    "bg-white/10 text-white border-white/10"
                  }`}
                >
                  {campaign.platform}
                </span>
              </div>
            </div>

            <div className="mt-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                {campaign.title}
              </h1>

              <p className="text-gray-400 mt-5 leading-8 whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-bold mb-4">Original content</h2>
              <p className="text-gray-400 text-sm mb-5">
                Use this authorized source material to create your clip.
              </p>
              <a
                href={campaign.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-5 py-3 text-sm font-semibold transition"
              >
                Watch source video ↗
              </a>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-bold mb-5">
                Campaign information
              </h2>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Starts</p>
                  <p className="text-sm font-medium">
                    {new Date(campaign.starts_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Ends</p>
                  <p className="text-sm font-medium">
                    {new Date(campaign.ends_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Platform</p>
                  <p className="text-sm font-medium">{campaign.platform}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Maximum reward per clipper
                  </p>
                  <p className="text-sm font-medium">
                    {campaign.max_reward_per_clipper
                      ? `${Number(campaign.max_reward_per_clipper).toFixed(3)} TND`
                      : "No separate cap specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-[#15131f] p-6">
              <p className="text-sm text-gray-400">
                Reward per 1,000 views
              </p>
              <p className="text-4xl font-bold text-violet-300 mt-2">
                {Number(campaign.reward_per_1000).toFixed(3)}
                <span className="text-lg ml-2">TND</span>
              </p>

              <div className="h-px bg-white/10 my-6" />

              <p className="text-sm text-gray-400">Total campaign budget</p>
              <p className="text-2xl font-bold mt-2">
                {Number(campaign.budget_total).toFixed(3)} TND
              </p>

              <p className="text-xs text-gray-500 mt-3">
                Rewards depend on qualified views and campaign verification rules.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-bold mb-2">Submit your clip</h2>
              <p className="text-sm text-gray-400 mb-6">
                Publish your clip on the campaign platform, then paste its
                public link here.
              </p>

              {submission ? (
                <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-sm font-semibold">
                      Your submission
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-300 capitalize">
                      {submission.status.replace("_", " ")}
                    </span>
                  </div>

                  <a
                    href={submission.clip_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-violet-300 hover:text-violet-200 break-all underline"
                  >
                    View submitted clip ↗
                  </a>

                  <p className="text-xs text-gray-500 mt-4">
                    Submitted{" "}
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              ) : !isActive ? (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
                  This campaign is not currently accepting submissions.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block text-sm text-gray-300">
                    Your published clip URL
                  </label>

                  <input
                    type="url"
                    required
                    value={clipUrl}
                    onChange={(e) => setClipUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/..."
                    className="w-full rounded-xl bg-[#0c0b13] border border-white/10 px-4 py-3 text-sm outline-none focus:border-violet-500 transition"
                  />

                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}

                  {message && (
                    <p className="text-sm text-green-400">{message}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-3 font-semibold transition shadow-lg shadow-violet-900/20"
                  >
                    {submitting ? "Submitting..." : "Submit my clip"}
                  </button>

                  <p className="text-xs text-gray-500 leading-5">
                    Only submit clips that follow the campaign rules and have
                    the required permissions.
                  </p>
                </form>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-sm font-semibold mb-2">How rewards work</p>
              <p className="text-xs text-gray-400 leading-6">
                Your estimated reward is based on qualified views divided by
                1,000, multiplied by the campaign rate. Views and rewards must
                be reviewed before any payment is confirmed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CampaignDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#09090f] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading campaign...</p>
          </div>
        </main>
      }
    >
      <CampaignDetailsContent />
    </Suspense>
  );
}
