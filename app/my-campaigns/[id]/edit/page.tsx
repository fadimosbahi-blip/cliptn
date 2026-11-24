
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
  source_url: string;
  rights_confirmed: boolean;
};

function EditCampaignContent() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCampaign() {
      try {
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

        if (profileError || !profile || profile.role !== "streamer") {
          router.replace("/dashboard");
          return;
        }

        const { data, error: campaignError } = await supabase
          .from("campaigns")
          .select("id, title, description, source_url, rights_confirmed")
          .eq("id", campaignId)
          .eq("streamer_id", authData.user.id)
          .maybeSingle();

        if (!active) return;

        if (campaignError || !data) {
          setError(
            "Campaign not found or you don't have permission to edit it."
          );
          return;
        }

        const loaded = data as Campaign;

        setCampaign(loaded);
        setTitle(loaded.title);
        setDescription(loaded.description);
        setSourceUrl(loaded.source_url);
        setRightsConfirmed(loaded.rights_confirmed);
      } catch (err) {
        console.error("Campaign loading error:", err);
        if (active) {
          setError("Something went wrong while loading this campaign.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (campaignId) loadCampaign();

    return () => {
      active = false;
    };
  }, [campaignId, router]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!campaign) return;

    if (title.trim().length < 3 || title.trim().length > 100) {
      setError("The title must contain between 3 and 100 characters.");
      return;
    }

    if (
      description.trim().length < 10 ||
      description.trim().length > 3000
    ) {
      setError(
        "The description must contain between 10 and 3,000 characters."
      );
      return;
    }

    try {
      const parsedUrl = new URL(sourceUrl.trim());

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        setError("Please enter a valid source URL.");
        return;
      }
    } catch {
      setError("Please enter a valid source URL.");
      return;
    }

    if (!rightsConfirmed) {
      setError(
        "Please confirm that you have permission to use this source content."
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const { error: updateError } = await supabase.rpc(
        "update_my_campaign_details",
        {
          p_campaign_id: campaign.id,
          p_title: title.trim(),
          p_description: description.trim(),
          p_source_url: sourceUrl.trim(),
          p_rights_confirmed: rightsConfirmed,
        }
      );

      if (updateError) {
        console.error("Campaign update error:", updateError);
        setError(updateError.message || "We couldn't save your changes.");
        return;
      }

      setSuccess("Your campaign has been updated successfully!");

      setCampaign({
        ...campaign,
        title: title.trim(),
        description: description.trim(),
        source_url: sourceUrl.trim(),
        rights_confirmed: rightsConfirmed,
      });
    } catch (err) {
      console.error("Campaign update error:", err);
      setError("Something went wrong while saving your changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">Loading campaign editor...</p>
        </div>
      </main>
    );
  }

  if (error && !campaign) {
    return (
      <main className="min-h-screen bg-[#080810] px-5 py-20 text-white">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#14121c] p-9 text-center">
          <div className="mb-5 text-4xl">⚠</div>
          <h1 className="text-2xl font-bold">Unable to open editor</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{error}</p>
          <Link
            href="/my-campaigns"
            className="mt-7 inline-flex rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
          >
            Back to My Campaigns
          </Link>
        </div>
      </main>
    );
  }

  if (!campaign) return null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-48 -left-40 h-[450px] w-[450px] rounded-full bg-indigo-700/[0.08] blur-[120px]" />

      <div className="relative mx-auto max-w-4xl">
        <header className="mb-10 flex items-center justify-between border-b border-white/[0.07] pb-6">
          <div>
            <Link
              href={`/my-campaigns/${campaign.id}`}
              className="text-xs text-zinc-500 transition hover:text-violet-300"
            >
              ← Back to campaign
            </Link>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
              Campaign management
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Edit campaign<span className="text-violet-400">.</span>
            </h1>
            <p className="mt-3 text-sm text-zinc-400">
              Update your campaign information without changing its financial settings.
            </p>
          </div>

          <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-2xl text-violet-300 sm:flex">
            ✎
          </div>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-3xl border border-white/[0.08] bg-[#14121c] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-lg font-bold">Campaign information</h2>
              <p className="mt-2 text-xs text-zinc-500">
                Keep your campaign details clear and accurate for clippers.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Campaign title
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  minLength={3}
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-4 text-sm text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
                  placeholder="Enter your campaign title"
                />
                <p className="mt-2 text-right text-[10px] text-zinc-600">
                  {title.length}/100
                </p>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Campaign description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  minLength={10}
                  maxLength={3000}
                  rows={7}
                  required
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
                  placeholder="Explain the campaign requirements..."
                />
                <p className="mt-2 text-right text-[10px] text-zinc-600">
                  {description.length}/3000
                </p>
              </div>

              <div>
                <label
                  htmlFor="sourceUrl"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Original content URL
                </label>
                <input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-4 text-sm text-white outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
                  placeholder="https://..."
                />
                <p className="mt-2 text-xs text-zinc-600">
                  This is the source material clippers use to create their videos.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.08] bg-[#14121c] p-6 sm:p-8">
            <h2 className="text-lg font-bold">Content permissions</h2>
            <p className="mt-2 text-xs leading-6 text-zinc-500">
              Confirm that you have the necessary rights or authorization to let clippers use this source content.
            </p>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0a12] p-5 transition hover:border-violet-400/30">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 accent-violet-500"
              />
              <span className="text-sm leading-6 text-zinc-300">
                I confirm that I have permission to use and authorize the use of the source content for this campaign.
              </span>
            </label>
          </section>

          <section className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.05] p-5">
            <div className="flex items-start gap-3">
              <span className="text-lg text-violet-300">🔒</span>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Financial settings protected
                </h3>
                <p className="mt-2 text-xs leading-6 text-zinc-400">
                  Your campaign budget, reward rate, maximum clipper reward, platform, dates and status are not changed by this editor. Existing submissions and reward records remain untouched.
                </p>
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-300"
            >
              {success}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={`/my-campaigns/${campaign.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/20 transition hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving changes..." : "Save changes →"}
            </button>
          </div>
        </form>

        <footer className="mt-12 border-t border-white/[0.07] py-6 text-center text-xs text-zinc-600">
          © {currentYear ?? ""} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}

export default function EditCampaignPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
            <p className="text-sm text-zinc-400">Loading campaign editor...</p>
          </div>
        </main>
      }
    >
      <EditCampaignContent />
    </Suspense>
  );
}
