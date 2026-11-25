
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReportUserButton from "@/components/ReportUserButton";

type StreamerProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  platform: string | null;
  channel_url: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  socials: Record<string, string> | null;
  is_public: boolean;
};

const supabase = createClient();

function validUrl(value: string | null | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function PublicStreamerPageContent() {
  const params = useParams<{ username: string }>();
  const router = useRouter();

  const username = decodeURIComponent(params.username || "").toLowerCase();

  const [profile, setProfile] = useState<StreamerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [messageStatus, setMessageStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);

      const { data, error } = await supabase
        .from("streamer_profiles")
        .select(
          "user_id, username, display_name, bio, platform, channel_url, avatar_url, cover_image_url, socials, is_public"
        )
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setProfile(null);
      } else {
        setProfile(data as StreamerProfile);
      }

      setLoading(false);
    }

    if (username) {
      loadProfile();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function handleMessageStreamer() {
    if (!profile || messaging) return;

    setMessaging(true);
    setMessageStatus("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      if (user.id === profile.user_id) {
        setMessageStatus("You cannot message yourself.");
        return;
      }

      const { data: currentProfile, error: roleError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (roleError || !currentProfile) {
        setMessageStatus("Couldn't verify your account. Please try again.");
        return;
      }

      if (currentProfile.role !== "clipper") {
        setMessageStatus(
          "Only clipper accounts can start conversations with streamers."
        );
        return;
      }

      const { data: existingConversation, error: lookupError } =
        await supabase
          .from("conversations")
          .select("id")
          .eq("streamer_id", profile.user_id)
          .eq("clipper_id", user.id)
          .is("campaign_id", null)
          .maybeSingle();

      if (lookupError) {
        setMessageStatus(
          "Couldn't check your conversations. Please try again."
        );
        return;
      }

      if (existingConversation) {
        router.push("/messages");
        return;
      }

      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          streamer_id: profile.user_id,
          clipper_id: user.id,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (createError || !newConversation) {
        const { data: retryConversation } = await supabase
          .from("conversations")
          .select("id")
          .eq("streamer_id", profile.user_id)
          .eq("clipper_id", user.id)
          .is("campaign_id", null)
          .maybeSingle();

        if (retryConversation) {
          router.push("/messages");
          return;
        }

        setMessageStatus(
          "Couldn't start the conversation. Please try again."
        );
        return;
      }

      router.push("/messages");
    } catch {
      setMessageStatus("Something went wrong. Please try again.");
    } finally {
      setMessaging(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070710] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm text-white/50">
            Loading streamer profile...
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#070710] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-5">👾</div>
          <h1 className="text-3xl font-bold mb-3">
            Streamer not found
          </h1>
          <p className="text-white/50 mb-7">
            This profile may not exist or may not be public.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
          >
            Back to ClipTN
          </Link>
        </div>
      </main>
    );
  }

  const avatar = validUrl(profile.avatar_url);
  const cover = validUrl(profile.cover_image_url);
  const channel = validUrl(profile.channel_url);

  const socials = Object.entries(profile.socials || {}).filter(
    ([, value]) => validUrl(value)
  );

  return (
    <main className="min-h-screen bg-[#070710] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-black tracking-tight transition hover:text-violet-300"
          >
            Clip<span className="text-violet-400">TN</span>
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 transition hover:border-violet-400/40 hover:text-white"
          >
            Explore ClipTN
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20">
          <div
            className="relative h-48 bg-gradient-to-br from-violet-900/80 via-[#17132e] to-blue-900/60 sm:h-64"
            style={
              cover
                ? {
                    backgroundImage: `linear-gradient(to bottom, rgba(7,7,16,0.05), rgba(7,7,16,0.55)), url("${cover}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#070710]/70 to-transparent" />
          </div>

          <div className="relative px-5 pb-8 sm:px-10">
            <div className="-mt-16 mb-5 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border-4 border-[#070710] bg-[#171326] shadow-xl sm:h-36 sm:w-36">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={`${profile.username}'s avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-violet-300">
                      {(profile.display_name || profile.username)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleMessageStreamer}
                  disabled={messaging}
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-6 py-3 font-semibold text-violet-200 transition hover:-translate-y-0.5 hover:border-violet-300/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {messaging ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
                      Opening...
                    </>
                  ) : (
                    <>
                      <span>✉</span>
                      Message Streamer
                    </>
                  )}
                </button>

                {channel && (
                  <a
                    href={channel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold shadow-lg shadow-violet-900/20 transition hover:-translate-y-0.5 hover:bg-violet-500"
                  >
                    Visit Channel
                    <span aria-hidden="true">↗</span>
                  </a>
                )}

                <ReportUserButton
                  reportedUserId={profile.user_id}
                  reportedUsername={profile.username}
                />
              </div>
            </div>

            {messageStatus && (
              <p
                role="status"
                className="mb-5 rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200"
              >
                {messageStatus}
              </p>
            )}

            <div>
              <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl">
                {profile.display_name || profile.username}
              </h1>

              <p className="mt-2 text-sm text-violet-300">
                @{profile.username}
              </p>

              {profile.platform && (
                <div className="mt-4 inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                  {profile.platform}
                </div>
              )}

              {profile.bio && (
                <p className="mt-6 max-w-2xl whitespace-pre-wrap break-words leading-7 text-white/65">
                  {profile.bio}
                </p>
              )}
            </div>

            {socials.length > 0 && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                  Connect
                </h2>

                <div className="flex flex-wrap gap-3">
                  {socials.map(([name, value]) => {
                    const url = validUrl(value);

                    if (!url) return null;

                    return (
                      <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm capitalize text-white/70 transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-white"
                      >
                        {name} ↗
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="py-10 text-center text-xs text-white/25">
          Powered by ClipTN
        </footer>
      </div>
    </main>
  );
}

export default function PublicStreamerPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#070710] text-white flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
            <p className="text-sm text-white/50">
              Loading streamer profile...
            </p>
          </div>
        </main>
      }
    >
      <PublicStreamerPageContent />
    </Suspense>
  );
}
