
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StreamerProfile = {
  username: string;
  display_name: string;
  bio: string;
  platform: string;
  channel_url: string;
  avatar_url: string;
  cover_image_url: string;
  socials: {
    youtube?: string;
    twitch?: string;
    tiktok?: string;
    instagram?: string;
    discord?: string;
  };
  is_public: boolean;
};

const emptyProfile: StreamerProfile = {
  username: "",
  display_name: "",
  bio: "",
  platform: "Twitch",
  channel_url: "",
  avatar_url: "",
  cover_image_url: "",
  socials: {
    youtube: "",
    twitch: "",
    tiktok: "",
    instagram: "",
    discord: "",
  },
  is_public: true,
};

const platforms = ["Twitch", "YouTube", "TikTok", "Kick", "Facebook", "Other"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export default function StreamerProfileEditor() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<StreamerProfile>(emptyProfile);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const id = authData.user.id;
      setUserId(id);

      const { data: account, error: accountError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();

      if (!active) return;

      if (accountError || account?.role !== "streamer") {
        router.replace("/dashboard");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("streamer_profiles")
        .select("*")
        .eq("user_id", id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError("We couldn't load your streamer profile.");
      } else if (data) {
        setProfile({
          ...emptyProfile,
          ...data,
          socials: {
            ...emptyProfile.socials,
            ...(data.socials ?? {}),
          },
        });
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  function updateField<K extends keyof StreamerProfile>(
    field: K,
    value: StreamerProfile[K]
  ) {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateSocial(
    field: keyof StreamerProfile["socials"],
    value: string
  ) {
    setProfile((previous) => ({
      ...previous,
      socials: {
        ...previous.socials,
        [field]: value,
      },
    }));
  }

  function isValidUrl(value: string) {
    if (!value.trim()) return true;

    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    imageType: "avatar" | "cover"
  ) {
    const file = event.target.files?.[0];

    // Allow selecting the same file again later.
    event.target.value = "";

    if (!file) return;

    setError("");
    setMessage("");

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Your image must be smaller than 5 MB.");
      return;
    }

    if (!userId) {
      setError("Your account is not ready. Please refresh the page.");
      return;
    }

    if (imageType === "avatar") {
      setAvatarUploading(true);
    } else {
      setCoverUploading(true);
    }

    try {
      const extension =
        file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/png"
            ? "png"
            : "webp";

      const filePath =
        `${userId}/streamer-${imageType}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("portfolio-images")
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicData } = supabase.storage
        .from("portfolio-images")
        .getPublicUrl(filePath);

      const imageUrl = publicData.publicUrl;

      if (imageType === "avatar") {
        updateField("avatar_url", imageUrl);
      } else {
        updateField("cover_image_url", imageUrl);
      }

      setMessage(
        imageType === "avatar"
          ? "Profile photo uploaded! Remember to save your profile."
          : "Banner uploaded! Remember to save your profile."
      );
    } catch (uploadError) {
      console.error("Streamer image upload error:", uploadError);

      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed. Please try again."
      );
    } finally {
      if (imageType === "avatar") {
        setAvatarUploading(false);
      } else {
        setCoverUploading(false);
      }
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (avatarUploading || coverUploading) {
      setError("Please wait for your image upload to finish.");
      return;
    }

    const username = profile.username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");

    if (!/^[a-z0-9_]{3,25}$/.test(username)) {
      setError(
        "Username must be 3–25 characters and use only lowercase letters, numbers, or underscores."
      );
      return;
    }

    if (profile.bio.length > 500) {
      setError("Your bio cannot exceed 500 characters.");
      return;
    }

    const urls = [
      profile.channel_url,
      profile.avatar_url,
      profile.cover_image_url,
      ...Object.values(profile.socials),
    ];

    if (!urls.every((url) => isValidUrl(url ?? ""))) {
      setError("Please enter valid links beginning with http:// or https://.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from("streamer_profiles")
      .upsert(
        {
          user_id: userId,
          username,
          display_name: profile.display_name.trim(),
          bio: profile.bio.trim(),
          platform: profile.platform,
          channel_url: profile.channel_url.trim(),
          avatar_url: profile.avatar_url.trim(),
          cover_image_url: profile.cover_image_url.trim(),
          socials: profile.socials,
          is_public: profile.is_public,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    setSaving(false);

    if (saveError) {
      if (saveError.code === "23505") {
        setError("That username is already taken. Try another one.");
      } else {
        setError(saveError.message);
      }
      return;
    }

    setProfile((previous) => ({
      ...previous,
      username,
    }));

    setMessage("Your streamer profile has been saved!");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading your creator profile...
          </p>
        </div>
      </main>
    );
  }

  const publicUrl = profile.username
    ? `/streamer/${encodeURIComponent(profile.username)}`
    : "";

  const inputClass =
    "mt-2 w-full rounded-xl border border-white/10 bg-[#0c0b14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/10";

  const labelClass =
    "text-xs font-semibold uppercase tracking-wider text-zinc-400";

  return (
    <main className="min-h-screen overflow-hidden bg-[#080810] text-white">
      <div className="pointer-events-none fixed -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[130px]" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-indigo-700/10 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-2xl font-black">
            Clip<span className="text-violet-400">TN</span>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
          >
            ← Back to dashboard
          </Link>
        </header>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Streamer identity
          </div>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Your creator profile.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
            Create your own public streamer page on ClipTN. Show your channel,
            introduce yourself, and give clippers a place to discover you.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile images */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#12111b] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Profile appearance</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Upload a banner and profile photo directly from your computer.
              </p>
            </div>

            <div className="space-y-8">
              {/* Banner upload */}
              <div>
                <label className={labelClass}>Profile banner</label>

                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0b14]">
                  <div className="relative flex h-36 items-center justify-center sm:h-48">
                    {profile.cover_image_url ? (
                      <img
                        src={profile.cover_image_url}
                        alt="Profile banner preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="mb-2 text-3xl">🖼️</div>
                        <p className="text-sm text-zinc-500">
                          Your banner will appear here
                        </p>
                      </div>
                    )}

                    <label
                      htmlFor="streamer-cover-upload"
                      className="absolute bottom-3 right-3 cursor-pointer rounded-xl border border-white/10 bg-black/70 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-violet-600"
                    >
                      {coverUploading ? "Uploading..." : "↑ Upload Banner"}
                    </label>

                    <input
                      id="streamer-cover-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={coverUploading}
                      onChange={(event) =>
                        handleImageUpload(event, "cover")
                      }
                      className="hidden"
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-zinc-600">
                  Recommended: wide image. JPG, PNG, or WebP. Maximum 5 MB.
                </p>
              </div>

              {/* Avatar upload */}
              <div>
                <label className={labelClass}>Profile photo</label>

                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0b14]">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile photo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">
                        👤
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="streamer-avatar-upload"
                      className="inline-flex cursor-pointer items-center rounded-xl border border-violet-400/20 bg-violet-400/[0.07] px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-400/[0.14]"
                    >
                      {avatarUploading ? "Uploading..." : "↑ Upload Photo"}
                    </label>

                    <input
                      id="streamer-avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={avatarUploading}
                      onChange={(event) =>
                        handleImageUpload(event, "avatar")
                      }
                      className="hidden"
                    />

                    <p className="mt-2 text-xs text-zinc-600">
                      Choose an image from your computer. Maximum 5 MB.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#12111b] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold">About you</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Tell the ClipTN community who you are.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Username *</label>
                <input
                  required
                  minLength={3}
                  maxLength={25}
                  value={profile.username}
                  onChange={(e) =>
                    updateField(
                      "username",
                      e.target.value.toLowerCase().replace(/\s+/g, "")
                    )
                  }
                  placeholder="your_username"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-zinc-600">
                  Your public URL: getcliptn.com/streamer/
                  {profile.username || "username"}
                </p>
              </div>

              <div>
                <label className={labelClass}>Display name</label>
                <input
                  value={profile.display_name}
                  onChange={(e) =>
                    updateField("display_name", e.target.value)
                  }
                  maxLength={80}
                  placeholder="Your streamer name"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => updateField("bio", e.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="Tell people about your content, your community, and what you stream..."
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-2 text-right text-xs text-zinc-600">
                  {profile.bio.length}/500
                </p>
              </div>
            </div>
          </section>

          {/* Channel */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#12111b] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Your channel</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Choose your main platform and link your channel.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Main platform</label>
                <select
                  value={profile.platform}
                  onChange={(e) => updateField("platform", e.target.value)}
                  className={inputClass}
                >
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Channel URL</label>
                <input
                  value={profile.channel_url}
                  onChange={(e) => updateField("channel_url", e.target.value)}
                  placeholder="https://twitch.tv/yourchannel"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Social links */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#12111b] p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold">Social links</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Add your social accounts so people can find you.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["youtube", "YouTube"],
                  ["twitch", "Twitch"],
                  ["tiktok", "TikTok"],
                  ["instagram", "Instagram"],
                  ["discord", "Discord invite"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input
                    value={profile.socials[key] ?? ""}
                    onChange={(e) => updateSocial(key, e.target.value)}
                    placeholder={`https://${key === "discord" ? "discord.gg/yourinvite" : `${key}.com/youraccount`}`}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Visibility */}
          <section className="rounded-3xl border border-white/[0.08] bg-[#12111b] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Public visibility</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  When enabled, anyone with your profile link can visit your
                  streamer page. Turn it off to make the page private.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <span className="text-sm font-medium text-zinc-300">
                  {profile.is_public ? "Public" : "Private"}
                </span>
                <input
                  type="checkbox"
                  checked={profile.is_public}
                  onChange={(e) =>
                    updateField("is_public", e.target.checked)
                  }
                  className="h-5 w-5 accent-violet-500"
                />
              </label>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-center text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.08]"
            >
              Cancel
            </Link>

            <div className="flex flex-wrap gap-3">
              {profile.username && profile.is_public && (
                <Link
                  href={publicUrl}
                  target="_blank"
                  className="rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-5 py-3.5 text-center text-sm font-semibold text-violet-200 transition hover:bg-violet-400/[0.12]"
                >
                  Preview profile ↗
                </Link>
              )}

              <button
                type="submit"
                disabled={saving || avatarUploading || coverUploading}
                className="rounded-xl bg-violet-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving profile..."
                  : avatarUploading || coverUploading
                    ? "Uploading image..."
                    : "Save profile"}
              </button>
            </div>
          </div>
        </form>

        <footer className="mt-12 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN · Built for creators in Tunisia 🇹🇳
        </footer>
      </div>
    </main>
  );
}
