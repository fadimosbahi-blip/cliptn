
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Password updated successfully! Redirecting to login...");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-5 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151420] p-8">
        <Link href="/" className="text-2xl font-black">
          Clip<span className="text-violet-400">TN</span>
        </Link>

        <div className="mt-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-violet-400">
            Account recovery
          </p>

          <h1 className="text-3xl font-black">
            Create a new password
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Choose a new password for your ClipTN account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              New password
            </label>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Confirm new password
            </label>

            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password again"
              className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 outline-none focus:border-violet-400"
            />
          </div>

          {message && (
            <p className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-violet-200">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-4 font-semibold transition hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? "Updating password..." : "Update password →"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-violet-400"
        >
          Back to login
        </Link>
      </div>
    </main>
  );
}
