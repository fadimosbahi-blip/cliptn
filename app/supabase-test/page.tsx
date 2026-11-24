
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SupabaseTestPage() {
  const [status, setStatus] = useState("Testing connection...");

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient();

        const { error } = await supabase.auth.getSession();

        if (error) {
          setStatus("Connection error: " + error.message);
          return;
        }

        setStatus("Supabase connection successful!");
      } catch (error) {
        setStatus(
          "Something went wrong: " +
            (error instanceof Error ? error.message : "Unknown error")
        );
      }
    }

    testConnection();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090f] px-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-[#151420] p-10 text-center">
        <h1 className="mb-4 text-3xl font-bold">ClipTN Backend Test</h1>
        <p className="text-zinc-300">{status}</p>
      </div>
    </main>
  );
}
