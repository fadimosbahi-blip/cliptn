
"use client";

import { useEffect, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Platform = "TikTok" | "YouTube" | "Instagram";

const platforms: {
  name: Platform;
  symbol: string;
  description: string;
}[] = [
  { name: "TikTok", symbol: "♪", description: "Short-form videos" },
  { name: "YouTube", symbol: "▶", description: "Shorts and videos" },
  { name: "Instagram", symbol: "◎", description: "Reels and content" },
];

function formatTND(value: number) {
  return new Intl.NumberFormat("en-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    return [
      e.message,
      e.code ? `Code: ${e.code}` : "",
      e.details || "",
      e.hint ? `Hint: ${e.hint}` : "",
    ].filter(Boolean).join(" — ");
  }

  return "An unexpected error occurred. Please try again.";
}

export default function CreateCampaignPage() {
  const router = useRouter();

  const [checkingUser, setCheckingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [reward, setReward] = useState("");
  const [maxReward, setMaxReward] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  useEffect(() => {
    let active = true;

    async function checkUser() {
      try {
        const supabase = createClient();
        const { data, error: authError } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !data.user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (!active) return;

        if (profileError || profile?.role !== "streamer") {
          router.replace("/dashboard");
          return;
        }

        setCheckingUser(false);
      } catch (err) {
        console.error("User check error:", err);
        if (active) router.replace("/login");
      }
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!coverImage) {
      setCoverPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(coverImage);
    setCoverPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [coverImage]);

  const numericBudget = Number(budget);
  const numericReward = Number(reward);
  const numericMaxReward = Number(maxReward);
  const hasMaxReward = maxReward.trim() !== "";

  const estimatedViews =
    numericBudget > 0 && numericReward > 0
      ? (numericBudget / numericReward) * 1000
      : 0;

  const completedFields = [
    title.trim().length >= 3,
    description.trim().length >= 10,
    Boolean(platform),
    /^https?:\/\/.+/i.test(sourceUrl),
    numericBudget > 0,
    numericReward > 0,
    Boolean(startsAt),
    Boolean(endsAt),
    rightsConfirmed,
  ];

  const progress = Math.round(
    (completedFields.filter(Boolean).length / completedFields.length) * 100
  );

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please choose a JPEG, PNG or WebP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your campaign image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setCoverImage(file);
  }

  function removeImage() {
    setCoverImage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setSuccess(false);

    if (
      !title.trim() ||
      !description.trim() ||
      !platform ||
      !sourceUrl.trim() ||
      !startsAt ||
      !endsAt
    ) {
      setError("Please complete all required fields.");
      setSaving(false);
      return;
    }

    if (
      title.trim().length < 3 ||
      title.trim().length > 100 ||
      description.trim().length < 10 ||
      description.trim().length > 3000
    ) {
      setError("Please check the title and description lengths.");
      setSaving(false);
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(sourceUrl.trim());
    } catch {
      setError("Please enter a valid source video URL.");
      setSaving(false);
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setError("Your source URL must use HTTP or HTTPS.");
      setSaving(false);
      return;
    }

    const budgetValue = Number(budget);
    const rewardValue = Number(reward);
    const maxRewardValue = hasMaxReward ? Number(maxReward) : null;

    if (
      !Number.isFinite(budgetValue) ||
      budgetValue <= 0 ||
      !Number.isFinite(rewardValue) ||
      rewardValue <= 0
    ) {
      setError("Budget and reward must be positive numbers.");
      setSaving(false);
      return;
    }

    if (
      maxRewardValue !== null &&
      (!Number.isFinite(maxRewardValue) ||
        maxRewardValue <= 0 ||
        maxRewardValue > budgetValue)
    ) {
      setError("Maximum reward must be positive and cannot exceed the campaign budget.");
      setSaving(false);
      return;
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      setError("The campaign end date must be after its start date.");
      setSaving(false);
      return;
    }

    if (!rightsConfirmed) {
      setError("Please confirm that you have permission to use this footage.");
      setSaving(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/login");
        throw new Error("Your session has expired. Please log in again.");
      }

      let coverImageUrl: string | null = null;

      if (coverImage) {
        const extension = coverImage.type === "image/jpeg"
          ? "jpg"
          : coverImage.type === "image/png"
            ? "png"
            : "webp";

        const imagePath =
          `${authData.user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("campaign-covers")
          .upload(imagePath, coverImage, {
            contentType: coverImage.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("campaign-covers")
          .getPublicUrl(imagePath);

        coverImageUrl = publicUrlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("campaigns")
        .insert({
          streamer_id: authData.user.id,
          title: title.trim(),
          description: description.trim(),
          platform,
          source_url: sourceUrl.trim(),
          budget_total: budgetValue,
          reward_per_1000: rewardValue,
          max_reward_per_clipper: maxRewardValue,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          rights_confirmed: true,
          status: "draft",
          cover_image_url: coverImageUrl,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTitle("");
      setDescription("");
      setPlatform("");
      setSourceUrl("");
      setBudget("");
      setReward("");
      setMaxReward("");
      setStartsAt("");
      setEndsAt("");
      setRightsConfirmed(false);
      setCoverImage(null);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      console.error("Campaign save error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-zinc-400">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm">Preparing your campaign studio...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080810] text-white">
      <style>{`
        @keyframes studioGlow {
          0%, 100% { opacity: .2; transform: scale(1); }
          50% { opacity: .5; transform: scale(1.12); }
        }
        @keyframes studioEnter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .studio-glow { animation: studioGlow 8s ease-in-out infinite; }
        .studio-enter { animation: studioEnter .6s ease-out both; }
        .studio-delay-1 { animation-delay: .1s; }
        .studio-delay-2 { animation-delay: .2s; }
        .studio-input {
          width: 100%;
          border: 1px solid rgba(255,255,255,.08);
          background: #0c0b13;
          border-radius: 12px;
          padding: 13px 15px;
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .studio-input:focus {
          border-color: rgba(167,139,250,.7);
          background: #100e19;
          box-shadow: 0 0 0 3px rgba(139,92,246,.10);
        }
        .studio-input::placeholder { color: #555365; }
        .studio-input option { background: #14121c; color: white; }
        .studio-section {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(20,18,28,.9);
          border-radius: 20px;
          padding: 22px;
        }
        @media (min-width: 640px) {
          .studio-section { padding: 28px; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="studio-glow pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      <div className="pointer-events-none fixed -bottom-60 -left-40 h-[450px] w-[450px] rounded-full bg-indigo-700/[0.07] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center justify-between border-b border-white/[0.07] pb-6">
          <Link href="/dashboard" className="text-xl font-black tracking-tight">
            Clip<span className="text-violet-400">TN</span>
            <span className="ml-2 rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 align-middle text-[9px] font-bold tracking-widest text-violet-300">
              BETA
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-violet-400/30 hover:text-white"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="studio-enter mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Streamer campaign studio
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
            Create your next{" "}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              campaign.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Build your campaign, showcase your content and give talented
            clippers an opportunity to promote your work.
          </p>
        </div>

        {success && (
          <div className="studio-enter mb-8 flex flex-col gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-emerald-300">Campaign saved successfully!</p>
              <p className="mt-1 text-xs leading-5 text-emerald-200/60">
                Your campaign is saved as a draft. It has not been published.
              </p>
            </div>
            <Link
              href="/my-campaigns"
              className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-center text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
            >
              View my campaigns →
            </Link>
          </div>
        )}

        <div className="studio-enter studio-delay-1 mb-8 rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Campaign setup</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Complete the required information below
              </p>
            </div>
            <span className="text-sm font-bold text-violet-300">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={handleSubmit} className="studio-enter studio-delay-1 space-y-6">
            <section className="studio-section">
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">01</div>
                <div>
                  <h2 className="text-base font-bold">Campaign identity</h2>
                  <p className="mt-1 text-xs text-zinc-500">Give your campaign its own visual identity</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex justify-between gap-3">
                    <label className="text-xs font-semibold text-zinc-300">
                      Campaign title <span className="text-violet-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-600">{title.length}/100</span>
                  </div>
                  <input
                    name="title"
                    required
                    minLength={3}
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Summer Gaming Highlights"
                    className="studio-input"
                  />
                </div>

                <div>
                  <div className="mb-2 flex justify-between gap-3">
                    <label className="text-xs font-semibold text-zinc-300">
                      Campaign description <span className="text-violet-400">*</span>
                    </label>
                    <span className="text-[10px] text-zinc-600">{description.length}/3000</span>
                  </div>
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain what kind of clips you want, which moments clippers should focus on, and any rules they must follow..."
                    className="studio-input resize-y leading-6"
                  />
                  <p className="mt-2 text-[10px] leading-5 text-zinc-600">
                    Clear instructions help clippers create better content.
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-white/[0.07] pt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300">Campaign cover image</label>
                    <p className="mt-1 text-[10px] text-zinc-500">Make your campaign stand out in the marketplace</p>
                  </div>
                  <span className="rounded-lg border border-violet-400/15 bg-violet-400/[0.07] px-2.5 py-1 text-[9px] font-bold text-violet-300">OPTIONAL</span>
                </div>

                {coverPreview ? (
                  <div className="group relative overflow-hidden rounded-2xl border border-violet-400/20 bg-[#0c0b13]">
                    <img
                      src={coverPreview}
                      alt="Campaign cover preview"
                      className="h-52 w-full object-cover sm:h-64"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <p className="text-xs font-bold text-white">Cover image preview</p>
                      <p className="mt-1 text-[10px] text-white/60">{coverImage?.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-3 top-3 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-[10px] font-semibold text-white backdrop-blur transition hover:bg-red-500/80"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-400/25 bg-gradient-to-br from-violet-500/[0.07] to-transparent px-5 py-9 text-center transition hover:border-violet-400/60 hover:bg-violet-500/[0.10]">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-2xl text-violet-300 transition group-hover:scale-105">
                      ↑
                    </span>
                    <span className="text-sm font-semibold text-zinc-200">Upload campaign artwork</span>
                    <span className="mt-2 text-xs text-zinc-500">Choose an image from your computer</span>
                    <span className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-bold text-violet-200">
                      Browse files
                    </span>
                    <span className="mt-4 text-[9px] text-zinc-600">JPEG, PNG or WebP · Maximum 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
                <p className="mt-3 text-[10px] leading-5 text-zinc-600">
                  Use artwork you own or have permission to display. A wide image works best for campaign cards.
                </p>
              </div>
            </section>

            <section className="studio-section">
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">02</div>
                <div>
                  <h2 className="text-base font-bold">Publishing platform</h2>
                  <p className="mt-1 text-xs text-zinc-500">Where should clippers publish their videos?</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {platforms.map((item) => {
                  const selected = platform === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setPlatform(item.name)}
                      className={`group relative rounded-2xl border p-4 text-left transition duration-200 ${
                        selected
                          ? "border-violet-400/50 bg-violet-500/[0.12] shadow-lg shadow-violet-950/20"
                          : "border-white/[0.07] bg-[#0c0b13] hover:border-white/20 hover:bg-white/[0.03]"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">✓</span>
                      )}
                      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${selected ? "bg-violet-400/15 text-violet-200" : "bg-white/[0.05] text-zinc-400 group-hover:text-white"}`}>
                        {item.symbol}
                      </span>
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="mt-1 text-[10px] text-zinc-500">{item.description}</p>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="platform" value={platform} />
              {!platform && <p className="mt-3 text-[10px] text-zinc-600">Select one platform to continue.</p>}
            </section>

            <section className="studio-section">
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">03</div>
                <div>
                  <h2 className="text-base font-bold">Source content</h2>
                  <p className="mt-1 text-xs text-zinc-500">Provide the footage clippers are allowed to use</p>
                </div>
              </div>

              <label className="mb-2 block text-xs font-semibold text-zinc-300">
                Authorized source video URL <span className="text-violet-400">*</span>
              </label>
              <input
                name="source_url"
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="studio-input"
              />
              <div className="mt-4 flex gap-3 rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-4">
                <span className="text-base text-amber-300">ⓘ</span>
                <p className="text-[11px] leading-5 text-zinc-400">
                  Only provide footage you own or are explicitly authorized to use. You are responsible for ensuring your permissions cover the intended use.
                </p>
              </div>
            </section>

            <section className="studio-section">
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">04</div>
                <div>
                  <h2 className="text-base font-bold">Budget and rewards</h2>
                  <p className="mt-1 text-xs text-zinc-500">Decide how much your campaign can spend</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-300">Total budget (TND) <span className="text-violet-400">*</span></label>
                  <div className="relative">
                    <input name="budget" type="number" min="0.001" step="0.001" required value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="500.000" className="studio-input pr-14" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">TND</span>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-300">Reward per 1,000 qualified views <span className="text-violet-400">*</span></label>
                  <div className="relative">
                    <input name="reward" type="number" min="0.001" step="0.001" required value={reward} onChange={(e) => setReward(e.target.value)} placeholder="2.000" className="studio-input pr-14" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">TND</span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-zinc-300">
                    Maximum reward per clipper <span className="ml-2 font-normal text-zinc-600">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input name="max_reward" type="number" min="0.001" step="0.001" value={maxReward} onChange={(e) => setMaxReward(e.target.value)} placeholder="50.000" className="studio-input pr-14" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">TND</span>
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-zinc-600">Set an individual reward limit for each clipper, or leave empty if you don't want an individual cap.</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.10] to-transparent p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold text-violet-200">Estimated campaign capacity</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300/60">Projection</span>
                </div>
                {numericBudget > 0 && numericReward > 0 ? (
                  <>
                    <p className="text-2xl font-black text-white sm:text-3xl">{Math.floor(estimatedViews).toLocaleString("en-US")}</p>
                    <p className="mt-1 text-xs text-zinc-400">qualified views potentially funded by this budget</p>
                    <div className="mt-4 border-t border-white/[0.07] pt-4">
                      <div className="flex justify-between gap-3 text-xs"><span className="text-zinc-500">Campaign budget</span><span className="font-semibold text-white">{formatTND(numericBudget)} TND</span></div>
                      <div className="mt-2 flex justify-between gap-3 text-xs"><span className="text-zinc-500">Reward rate</span><span className="font-semibold text-violet-300">{formatTND(numericReward)} TND / 1K views</span></div>
                      {hasMaxReward && numericMaxReward > 0 && <div className="mt-2 flex justify-between gap-3 text-xs"><span className="text-zinc-500">Individual clipper cap</span><span className="font-semibold text-white">{formatTND(numericMaxReward)} TND</span></div>}
                    </div>
                  </>
                ) : (
                  <p className="text-xs leading-6 text-zinc-500">Enter your budget and reward rate to see how many qualified views your campaign could potentially fund.</p>
                )}
                <p className="mt-4 text-[10px] leading-5 text-zinc-600">This is a mathematical estimate, not a guaranteed number of views or earnings. Actual rewards depend on qualified, verified views and campaign limits.</p>
              </div>
            </section>

            <section className="studio-section">
              <div className="mb-7 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">05</div>
                <div>
                  <h2 className="text-base font-bold">Campaign schedule</h2>
                  <p className="mt-1 text-xs text-zinc-500">Choose when your campaign should run</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-300">Start date and time <span className="text-violet-400">*</span></label>
                  <input name="starts_at" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="studio-input [color-scheme:dark]" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-zinc-300">End date and time <span className="text-violet-400">*</span></label>
                  <input name="ends_at" type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="studio-input [color-scheme:dark]" />
                </div>
              </div>
            </section>

            <section className="studio-section">
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/[0.09] text-lg font-bold text-violet-300">06</div>
                <div>
                  <h2 className="text-base font-bold">Content permissions</h2>
                  <p className="mt-1 text-xs text-zinc-500">Confirm your rights before saving</p>
                </div>
              </div>
              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/[0.07] bg-[#0c0b13] p-4 transition hover:border-violet-400/25">
                <input name="rights_confirmed" type="checkbox" required checked={rightsConfirmed} onChange={(e) => setRightsConfirmed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-violet-500" />
                <span className="text-xs leading-6 text-zinc-300">I confirm that I own this footage or have permission to authorize its use in this campaign. I will provide clear participation rules and ensure that the content can be used as described.</span>
              </label>
            </section>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.08] p-4 text-sm text-red-300">
                <div className="flex gap-3">
                  <span>!</span>
                  <p className="break-words">{error}</p>
                </div>
                <p className="mt-3 border-t border-red-400/10 pt-3 text-[10px] leading-5 text-red-200/60">
                  The campaign was not confirmed as saved. Share this exact error so we can diagnose it.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-[#211735] to-[#12101b] p-6 sm:p-7">
              <h3 className="text-base font-bold">Ready to save your campaign?</h3>
              <p className="mt-2 text-xs leading-6 text-zinc-400">Your campaign will be saved privately as a draft. It won't be published or made available to clippers until a separate approval process is completed.</p>
              <button type="submit" disabled={saving} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-4 text-sm font-bold shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving your campaign...
                  </>
                ) : (
                  <>Save campaign as draft <span className="text-lg">→</span></>
                )}
              </button>
              <p className="mt-4 text-center text-[10px] text-zinc-500">No publication or payment is triggered by saving a draft.</p>
            </div>
          </form>

          <aside className="studio-enter studio-delay-2 space-y-5 lg:sticky lg:top-8">
            <div className="rounded-2xl border border-white/[0.08] bg-[#14121c] p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Live preview</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Updates as you build</p>
                </div>
                <span className="rounded-md border border-violet-400/20 bg-violet-400/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-violet-300">Preview</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0b13]">
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-[#352052] via-[#201632] to-[#11101a]">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Campaign cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="studio-glow absolute inset-0 flex items-center justify-center">
                      <span className="text-5xl text-violet-200/80">
                        {platform === "TikTok" ? "♪" : platform === "YouTube" ? "▶" : platform === "Instagram" ? "◎" : "◇"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white/80 backdrop-blur">
                    {platform || "Select platform"}
                  </span>
                </div>

                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-[9px] font-bold text-zinc-300">Draft preview</span>
                    <span className="text-[9px] text-zinc-600">ClipTN</span>
                  </div>
                  <h3 className="break-words text-base font-bold leading-6">{title || "Your campaign title"}</h3>
                  <p className="mt-2 line-clamp-4 min-h-[64px] text-[11px] leading-5 text-zinc-500">
                    {description || "Your campaign description will appear here. Tell clippers what kind of content you're looking for."}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <p className="text-[9px] text-zinc-500">Total budget</p>
                      <p className="mt-1 text-sm font-bold text-white">{numericBudget > 0 ? formatTND(numericBudget) : "—"}</p>
                      <p className="text-[9px] text-zinc-600">TND</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                      <p className="text-[9px] text-zinc-500">Reward / 1K</p>
                      <p className="mt-1 text-sm font-bold text-violet-300">{numericReward > 0 ? formatTND(numericReward) : "—"}</p>
                      <p className="text-[9px] text-zinc-600">TND</p>
                    </div>
                  </div>
                  {sourceUrl && <div className="mt-4 truncate border-t border-white/[0.06] pt-3 text-[10px] text-zinc-500">Source: {sourceUrl}</div>}
                </div>
              </div>
              <p className="mt-4 text-[10px] leading-5 text-zinc-600">This is a visual preview of your campaign details, not a live published listing.</p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#14121c] p-5">
              <h3 className="text-sm font-bold">Campaign tips</h3>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs text-violet-300">1</span>
                  <div><p className="text-xs font-semibold text-zinc-300">Make it recognizable</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">A strong cover image helps your campaign stand out.</p></div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs text-violet-300">2</span>
                  <div><p className="text-xs font-semibold text-zinc-300">Set a clear reward</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">Choose a rate that fits your budget and campaign goals.</p></div>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 text-xs text-violet-300">3</span>
                  <div><p className="text-xs font-semibold text-zinc-300">Check permissions</p><p className="mt-1 text-[10px] leading-5 text-zinc-500">Make sure clippers are allowed to use your source footage.</p></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-400/10 bg-violet-400/[0.04] p-5">
              <p className="text-xs font-semibold text-violet-200">Your campaign, your rules.</p>
              <p className="mt-2 text-[10px] leading-5 text-zinc-500">Your campaign is saved as a draft first. Approval and publication will be handled separately.</p>
            </div>
          </aside>
        </div>

        <footer className="mt-14 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
