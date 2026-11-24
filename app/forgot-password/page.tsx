
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Check your email for the password reset link.");
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

        <h1 className="mt-10 text-3xl font-black">Forgot your password?</h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Enter your registered email and we'll send you a password reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your email address"
            className="w-full rounded-xl border border-white/10 bg-[#0d0c14] px-4 py-3 outline-none focus:border-violet-400"
          />

          {message && (
            <p className="rounded-xl bg-violet-400/10 p-4 text-sm text-violet-200">
              {message}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link →"}
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
