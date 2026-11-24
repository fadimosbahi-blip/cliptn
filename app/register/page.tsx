
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function RegisterForm() {
  const searchParams = useSearchParams();
  const selectedRole = searchParams.get("role");
  const role = selectedRole === "streamer" ? "streamer" : "clipper";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isStreamer = role === "streamer";

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const country = String(formData.get("country") || "TN");
    const password = String(formData.get("password") || "");

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            country,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      if (data.session) {
        setMessage(
          "Your account has been created successfully! You can now log in."
        );
      } else {
        setMessage(
          "Your account has been created! Please check your email to confirm your registration."
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090f] text-white">
      <div className="pointer-events-none absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-violet-700/15 blur-[150px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[150px]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left branding panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] px-12 py-10 lg:flex xl:px-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.12),transparent_55%)]" />

          <Link
            href="/"
            className="relative z-10 w-fit text-3xl font-black tracking-tight"
          >
            Clip<span className="text-violet-400">TN</span>
            <span className="ml-2 align-top text-[10px] font-semibold tracking-[0.2em] text-zinc-600">
              BETA
            </span>
          </Link>

          <div className="relative z-10 max-w-lg">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-4 py-2 text-xs font-semibold text-violet-300">
              <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.9)]" />
              THE CREATOR ECONOMY STARTS HERE
            </div>

            <h1 className="text-5xl font-black leading-[1.12] tracking-tight xl:text-6xl">
              Turn content
              <br />
              into <span className="text-violet-400">opportunity.</span>
            </h1>

            <p className="mt-7 max-w-md text-base leading-8 text-zinc-400">
              A new space where creators grow their reach and talented clippers
              get rewarded for their creativity.
            </p>

            <div className="mt-12 space-y-4">
              <div
                className={`flex items-center gap-4 rounded-2xl border p-5 transition ${
                  isStreamer
                    ? "border-violet-400/30 bg-violet-500/[0.09]"
                    : "border-white/[0.07] bg-white/[0.025]"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-2xl">
                  🎙️
                </div>
                <div>
                  <p className="font-semibold text-white">For streamers</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Launch campaigns and let your content travel further.
                  </p>
                </div>
                {isStreamer && (
                  <span className="ml-auto text-xs font-semibold text-violet-300">
                    SELECTED
                  </span>
                )}
              </div>

              <div
                className={`flex items-center gap-4 rounded-2xl border p-5 transition ${
                  !isStreamer
                    ? "border-violet-400/30 bg-violet-500/[0.09]"
                    : "border-white/[0.07] bg-white/[0.025]"
                }`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-2xl">
                  ✂️
                </div>
                <div>
                  <p className="font-semibold text-white">For clippers</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Create clips, discover opportunities and showcase your
                    skills.
                  </p>
                </div>
                {!isStreamer && (
                  <span className="ml-auto text-xs font-semibold text-violet-300">
                    SELECTED
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-zinc-600">
            <span>ClipTN · Built with ambition in Tunisia 🇹🇳</span>
            <span>© 2026 ClipTN</span>
          </div>
        </section>

        {/* Registration panel */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-[490px] animate-register">
            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link href="/" className="text-2xl font-black tracking-tight">
                Clip<span className="text-violet-400">TN</span>
              </Link>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-wider text-violet-300">
                BETA
              </span>
            </div>

            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-2xl shadow-[0_0_35px_rgba(139,92,246,0.12)]">
                {isStreamer ? "🎙️" : "✂️"}
              </div>

              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-violet-400">
                Join the ClipTN community
              </p>

              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Create your account<span className="text-violet-400">.</span>
              </h2>

              <p className="mt-3 text-sm leading-7 text-zinc-400">
                {isStreamer
                  ? "Build your presence, launch campaigns and reach a wider audience."
                  : "Showcase your creativity, discover campaigns and start your journey."}
              </p>
            </div>

            {/* Selected role */}
            <div className="mb-6 flex items-center justify-between rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-xl">
                  {isStreamer ? "🎙️" : "✂️"}
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500">
                    REGISTERING AS
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {isStreamer ? "Streamer" : "Clipper"}
                  </p>
                </div>
              </div>

              <Link
                href="/join"
                className="text-xs font-semibold text-violet-400 transition hover:text-violet-300"
              >
                Change role ↗
              </Link>
            </div>

            <form
              onSubmit={handleRegister}
              className="space-y-5 rounded-2xl border border-white/[0.08] bg-[#12111b]/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-8"
            >
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Country
                </label>
                <select
                  id="country"
                  name="country"
                  defaultValue="TN"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-3.5 text-sm text-white outline-none transition hover:border-white/15 focus:border-violet-400/70"
                >
                  <option value="TN">🇹🇳 Tunisia</option>
                  <option value="DZ">🇩🇿 Algeria</option>
                  <option value="MA">🇲🇦 Morocco</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-semibold text-zinc-300"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    minLength={8}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0b0a12] px-4 py-3.5 pr-20 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/15 focus:border-violet-400/70 focus:ring-2 focus:ring-violet-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-violet-400 transition hover:text-violet-300"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-600">
                  Use at least 8 characters for your password.
                </p>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-violet-500"
                />
                <label
                  htmlFor="terms"
                  className="cursor-pointer text-xs leading-6 text-zinc-400"
                >
                  I agree to the ClipTN Terms of Service and Privacy Policy.
                </label>
              </div>

              {message && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4 text-sm leading-6 text-violet-200"
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-violet-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:-translate-y-0.5 hover:bg-violet-500 hover:shadow-violet-900/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                <span className="relative z-10">
                  {loading ? "Creating your account..." : "Create account"}
                  {!loading && (
                    <span className="ml-2 transition group-hover:translate-x-1">
                      →
                    </span>
                  )}
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </button>

              <p className="pt-1 text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  Log in
                </Link>
              </p>
            </form>

            <p className="mt-7 text-center text-[11px] text-zinc-600">
              By joining ClipTN, you're taking your first step into a growing
              creator community.
            </p>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes registerEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-register {
          animation: registerEnter 0.65s ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-register {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#09090f] text-sm text-zinc-400">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
