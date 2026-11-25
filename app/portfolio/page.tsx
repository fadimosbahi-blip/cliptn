"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Portfolio = {
  username: string;
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string;
  cover_image_url: string;
  skills: string[];
  editing_software: string[];
  languages: string[];
  social_links: Record<string, string>;
  is_public: boolean;
};

const emptyPortfolio: Portfolio = {
  username: "",
  display_name: "",
  headline: "",
  bio: "",
  avatar_url: "",
  cover_image_url: "",
  skills: [],
  editing_software: [],
  languages: [],
  social_links: {
    tiktok: "",
    instagram: "",
    youtube: "",
    twitch: "",
    website: "",
  },
  is_public: true,
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0d0c15]/90 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";

const labelClass = "mb-2 block text-sm font-semibold text-zinc-300";
const sectionClass =
  "rounded-3xl border border-white/[0.08] bg-[#11101b]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-8";

export default function PortfolioPage() {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [portfolio, setPortfolio] = useState<Portfolio>(emptyPortfolio);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPortfolio() {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      setUserId(authData.user.id);

      const { data: account, error: accountError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", authData.user.id)
        .single();

      if (!active) return;

      if (accountError || !account) {
        setError("We couldn't load your account.");
        setLoading(false);
        return;
      }

      if (account.role !== "clipper") {
        router.replace("/dashboard");
        return;
      }

      const { data, error: portfolioError } = await supabase
        .from("clipper_profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!active) return;

      if (portfolioError) {
        setError(portfolioError.message);
        setLoading(false);
        return;
      }

      if (data) {
        setPortfolio({
          username: data.username ?? "",
          display_name: data.display_name ?? "",
          headline: data.headline ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? "",
          cover_image_url: data.cover_image_url ?? "",
          skills: data.skills ?? [],
          editing_software: data.editing_software ?? [],
          languages: data.languages ?? [],
          social_links: {
            ...emptyPortfolio.social_links,
            ...(data.social_links ?? {}),
          },
          is_public: data.is_public ?? true,
        });
      } else {
        setPortfolio({
          ...emptyPortfolio,
          display_name: account.full_name ?? "",
        });
      }

      setLoading(false);
    }

    void loadPortfolio();

    return () => {
      active = false;
    };
  }, [router]);

  function updateField<K extends keyof Portfolio>(field: K, value: Portfolio[K]) {
    setPortfolio((previous) => ({ ...previous, [field]: value }));
  }

  function updateSocial(platform: string, value: string) {
    setPortfolio((previous) => ({
      ...previous,
      social_links: { ...previous.social_links, [platform]: value },
    }));
  }

  function parseList(value: string) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    imageType: "avatar" | "cover"
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/") ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be 5 MB or smaller.");
      return;
    }

    if (!userId) {
      setError("Your account is still loading. Please try again.");
      return;
    }

    if (imageType === "avatar") setUploadingAvatar(true);
    else setUploadingCover(true);

    const supabase = createClient();
    const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const path = `${userId}/${imageType}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("portfolio-images")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError(`Image upload failed: ${uploadError.message}`);
      setUploadingAvatar(false);
      setUploadingCover(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("portfolio-images")
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    if (imageType === "avatar") {
      setPortfolio((previous) => ({ ...previous, avatar_url: publicUrl }));
    } else {
      setPortfolio((previous) => ({ ...previous, cover_image_url: publicUrl }));
    }

    setSuccess(
      imageType === "avatar"
        ? "Profile picture uploaded. Save your portfolio to publish the change."
        : "Cover image uploaded. Save your portfolio to publish the change."
    );
    setUploadingAvatar(false);
    setUploadingCover(false);
  }

  async function removeImage(imageType: "avatar" | "cover") {
    setError("");
    setSuccess("");
    if (imageType === "avatar") {
      setPortfolio((previous) => ({ ...previous, avatar_url: "" }));
    } else {
      setPortfolio((previous) => ({ ...previous, cover_image_url: "" }));
    }
    setSuccess("Image removed from your portfolio. Save to confirm the change.");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const username = portfolio.username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      setError("Username must contain 3–24 characters: lowercase letters, numbers or underscores.");
      return;
    }
    if (!portfolio.display_name.trim()) {
      setError("Please enter your display name.");
      return;
    }
    if (portfolio.display_name.trim().length > 60) {
      setError("Your display name cannot exceed 60 characters.");
      return;
    }
    if (portfolio.headline.length > 120) {
      setError("Your headline cannot exceed 120 characters.");
      return;
    }
    if (portfolio.bio.length > 1000) {
      setError("Your biography cannot exceed 1000 characters.");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const socialLinks = Object.fromEntries(
      Object.entries(portfolio.social_links).map(([key, value]) => [key, value.trim()])
    );

    const payload = {
      user_id: userId,
      username,
      display_name: portfolio.display_name.trim(),
      headline: portfolio.headline.trim(),
      bio: portfolio.bio.trim(),
      avatar_url: portfolio.avatar_url || null,
      cover_image_url: portfolio.cover_image_url || null,
      skills: portfolio.skills,
      editing_software: portfolio.editing_software,
      languages: portfolio.languages,
      social_links: socialLinks,
      is_public: portfolio.is_public,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("clipper_profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (saveError) {
      if (saveError.code === "23505" || saveError.message.toLowerCase().includes("unique")) {
        setError("That username is already taken. Please choose another.");
      } else {
        setError(`We couldn't save your portfolio: ${saveError.message}`);
      }
      setSaving(false);
      return;
    }

    setPortfolio((previous) => ({ ...previous, username }));
    setSuccess("Your portfolio has been saved successfully.");
    setSaving(false);
  }

  async function copyPortfolioLink() {
    if (!portfolio.username) {
      setError("Choose a username and save your portfolio first.");
      return;
    }
    const link = `${window.location.origin}/clipper/${portfolio.username}`;
    try {
      await navigator.clipboard.writeText(link);
      setSuccess("Portfolio link copied!");
      setError("");
    } catch {
      setError("Unable to copy the link. Please copy it manually.");
    }
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080810] text-white">
        <BackgroundEffects />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">Loading your portfolio...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-4 py-8 text-white sm:px-8 sm:py-10">
      <BackgroundEffects />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-2xl font-black tracking-tight">
            Clip<span className="text-violet-400">TN</span>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolio/projects"
              className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
            >
              Manage projects
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              ← Dashboard
            </Link>
          </div>
        </header>

        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-violet-300">
            Creator identity
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Build your <span className="text-violet-400">portfolio.</span>
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Show streamers what you can do. Make your work, style and experience stand out.
          </p>
        </div>

        {(error || success) && (
          <div
            role="status"
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-400/20 bg-red-500/10 text-red-200"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {error || success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-6">
              <h2 className="text-lg font-bold">Your visual identity</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Add a profile picture and a wide cover image to make your public page yours.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#090812]">
              <div className="relative h-40 sm:h-52">
                {portfolio.cover_image_url ? (
                  <img
                    src={portfolio.cover_image_url}
                    alt="Portfolio cover preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-950 via-[#17132b] to-blue-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(139,92,246,0.3),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.22),transparent_40%)]" />
                    <span className="relative text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                      Your portfolio cover
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/80 disabled:opacity-50"
                  >
                    {uploadingCover ? "Uploading..." : "Upload cover"}
                  </button>
                  {portfolio.cover_image_url && (
                    <button
                      type="button"
                      onClick={() => removeImage("cover")}
                      className="rounded-lg border border-white/15 bg-black/60 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-black/80"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
                <div className="-mt-14 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-[#090812] bg-gradient-to-br from-violet-600 to-blue-600 shadow-xl">
                  {portfolio.avatar_url ? (
                    <img src={portfolio.avatar_url} alt="Profile picture preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black">
                      {(portfolio.display_name || "C").charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
                  >
                    {uploadingAvatar ? "Uploading..." : "Upload profile picture"}
                  </button>
                  {portfolio.avatar_url && (
                    <button
                      type="button"
                      onClick={() => removeImage("avatar")}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/[0.08]"
                    >
                      Remove picture
                    </button>
                  )}
                  <p className="basis-full text-[11px] text-zinc-500">
                    JPG, PNG or WebP · Maximum 5 MB per image
                  </p>
                </div>
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void uploadImage(event, "avatar")}
            />
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void uploadImage(event, "cover")}
            />
          </section>

          <section className={sectionClass}>
            <h2 className="text-lg font-bold">Basic information</h2>
            <p className="mb-7 mt-1 text-xs text-zinc-500">
              This is how streamers and visitors will recognize you.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Portfolio username</label>
                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-[#0d0c15]/90 focus-within:border-violet-400/50">
                  <span className="flex items-center border-r border-white/10 px-3 text-sm text-zinc-500">/</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                    value={portfolio.username}
                    onChange={(event) => updateField("username", event.target.value.toLowerCase())}
                    minLength={3}
                    maxLength={24}
                    placeholder="yourname"
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">
                  3–24 characters. Lowercase letters, numbers and underscores.
                </p>
              </div>

              <div>
                <label className={labelClass}>Display name</label>
                <input
                  className={inputClass}
                  value={portfolio.display_name}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  maxLength={60}
                  placeholder="Your creator name"
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Professional headline</label>
                <input
                  className={inputClass}
                  value={portfolio.headline}
                  onChange={(event) => updateField("headline", event.target.value)}
                  maxLength={120}
                  placeholder="Short-form video editor helping creators grow"
                />
                <p className="mt-2 text-right text-[11px] text-zinc-600">
                  {portfolio.headline.length}/120
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>About you</label>
                <textarea
                  className={`${inputClass} min-h-36 resize-y`}
                  value={portfolio.bio}
                  onChange={(event) => updateField("bio", event.target.value)}
                  maxLength={1000}
                  placeholder="Tell streamers about your experience, your editing style and what makes your work special..."
                />
                <p className="mt-2 text-right text-[11px] text-zinc-600">
                  {portfolio.bio.length}/1000
                </p>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-lg font-bold">Your creative skills</h2>
            <p className="mb-7 mt-1 text-xs text-zinc-500">Separate each entry with a comma.</p>

            <div className="space-y-5">
              <div>
                <label className={labelClass}>Skills</label>
                <input
                  className={inputClass}
                  value={portfolio.skills.join(", ")}
                  onChange={(event) => updateField("skills", parseList(event.target.value))}
                  placeholder="Video editing, Storytelling, Subtitles, Motion graphics"
                />
              </div>
              <div>
                <label className={labelClass}>Editing software</label>
                <input
                  className={inputClass}
                  value={portfolio.editing_software.join(", ")}
                  onChange={(event) => updateField("editing_software", parseList(event.target.value))}
                  placeholder="CapCut, Premiere Pro, DaVinci Resolve"
                />
              </div>
              <div>
                <label className={labelClass}>Languages</label>
                <input
                  className={inputClass}
                  value={portfolio.languages.join(", ")}
                  onChange={(event) => updateField("languages", parseList(event.target.value))}
                  placeholder="Arabic, French, English"
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className="text-lg font-bold">Social presence</h2>
            <p className="mb-7 mt-1 text-xs text-zinc-500">Let people discover more of your work.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ["tiktok", "TikTok", "https://tiktok.com/@username"],
                ["instagram", "Instagram", "https://instagram.com/username"],
                ["youtube", "YouTube", "https://youtube.com/@username"],
                ["twitch", "Twitch", "https://twitch.tv/username"],
                ["website", "Personal website", "https://example.com"],
              ].map(([key, name, placeholder]) => (
                <div key={key}>
                  <label className={labelClass}>{name}</label>
                  <input
                    className={inputClass}
                    value={portfolio.social_links[key] ?? ""}
                    onChange={(event) => updateSocial(key, event.target.value)}
                    placeholder={placeholder}
                    type="text"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className={`${sectionClass} bg-gradient-to-br from-[#211735]/90 to-[#11101b]/90`}>
            <h2 className="text-lg font-bold">Portfolio visibility</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Make your portfolio accessible to streamers and visitors, even if they don't have a ClipTN account.
            </p>
            <label className="mt-6 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
              <div>
                <p className="text-sm font-semibold">Public portfolio</p>
                <p className="mt-1 text-xs text-zinc-500">Allow anyone to view your professional profile.</p>
              </div>
              <input
                type="checkbox"
                checked={portfolio.is_public}
                onChange={(event) => updateField("is_public", event.target.checked)}
                className="h-5 w-5 accent-violet-500"
              />
            </label>

            {portfolio.username && (
              <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your portfolio address</p>
                <p className="break-all text-sm text-violet-300">
                  {typeof window !== "undefined" ? window.location.origin : "https://getcliptn.com"}
                  /clipper/{portfolio.username}
                </p>
              </div>
            )}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || uploadingAvatar || uploadingCover}
              className="flex-1 rounded-xl bg-violet-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving portfolio..." : "Save portfolio"}
            </button>
            <button
              type="button"
              onClick={copyPortfolioLink}
              disabled={!portfolio.username}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-40"
            >
              Copy portfolio link
            </button>
          </div>
        </form>

        <footer className="mt-12 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>

      <style jsx global>{`
        .cliptn-grid {
          background-image:
            linear-gradient(rgba(139, 92, 246, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.045) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, black, transparent 90%);
        }
        @keyframes cliptn-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(35px, -25px, 0) scale(1.08); }
        }
        @keyframes cliptn-float {
          0%, 100% { transform: translateY(0); opacity: .25; }
          50% { transform: translateY(-18px); opacity: .65; }
        }
        .cliptn-orb { animation: cliptn-drift 18s ease-in-out infinite; }
        .cliptn-orb-slow { animation: cliptn-drift 24s ease-in-out infinite reverse; }
        .cliptn-particle { animation: cliptn-float 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cliptn-orb, .cliptn-orb-slow, .cliptn-particle { animation: none !important; }
        }
      `}</style>
    </main>
  );
}

function BackgroundEffects() {
  const particles = [
    ["8%", "18%", "0s"], ["18%", "72%", "1.2s"], ["32%", "38%", "2.1s"],
    ["48%", "82%", "0.7s"], ["63%", "17%", "2.8s"], ["78%", "58%", "1.6s"],
    ["91%", "30%", "3.3s"], ["70%", "88%", "2.4s"], ["5%", "90%", "1.9s"],
    ["39%", "10%", "3.8s"], ["85%", "8%", "0.4s"], ["56%", "52%", "2.6s"],
  ];

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="cliptn-grid absolute inset-0 opacity-70" />
      <div className="cliptn-orb absolute -right-48 -top-48 h-[620px] w-[620px] rounded-full bg-violet-700/15 blur-[140px]" />
      <div className="cliptn-orb-slow absolute -bottom-56 -left-48 h-[620px] w-[620px] rounded-full bg-blue-700/15 blur-[150px]" />
      <div className="absolute left-[35%] top-[35%] h-[420px] w-[420px] rounded-full bg-fuchsia-700/[0.07] blur-[140px]" />
      {particles.map(([left, top, delay], index) => (
        <span
          key={index}
          className="cliptn-particle absolute h-1 w-1 rounded-full bg-violet-200/60 shadow-[0_0_12px_rgba(167,139,250,0.8)]"
          style={{ left, top, animationDelay: delay }}
        />
      ))}
    </div>
  );
}
