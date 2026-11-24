
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AdminUser = {
  user_id: string;
  email: string | null;
  full_name: string;
  role: "streamer" | "clipper";
  country: string;
  is_verified: boolean;
  verified_at: string | null;
  account_created_at: string;
  campaign_count: number;
  submission_count: number;
  approved_submissions: number;
  approved_campaigns: number;
  total_users: number;
};

export default function AdminUsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const supabase = createClient();
  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error: usersError } = await supabase.rpc(
      "admin_get_users",
      {
        p_search: search.trim() || null,
        p_role: role,
        p_limit: pageSize,
        p_offset: page * pageSize,
      }
    );

    if (usersError) {
      setError(
        usersError.message.includes("Administrator access required")
          ? "You do not have administrator access."
          : usersError.message
      );
      setUsers([]);
      setTotalUsers(0);
      setLoading(false);
      return;
    }

    const result = (data ?? []) as AdminUser[];

    setUsers(result);
    setTotalUsers(Number(result[0]?.total_users ?? 0));
    setLoading(false);
  }, [router, supabase, search, role, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

  return (
    <main className="min-h-screen bg-[#08080d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-purple-900/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-5 py-8 sm:px-8 lg:px-12">

        {/* Header */}
        <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <Link
              href="/admin/verifications"
              className="text-sm text-gray-500 transition hover:text-white"
            >
              ← Back to administration
            </Link>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10 text-xl">
                ◈
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  ClipTN <span className="text-violet-400">Admin</span>
                </h1>
                <p className="text-xs text-gray-500">
                  User management
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-gray-300 transition hover:border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh users"}
          </button>
        </header>

        {/* Page title */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
              Administration
            </span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            User <span className="text-violet-400">Management</span>
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Browse registered streamers and clippers, inspect account
            activity, and monitor verification status.
          </p>
        </section>

        {/* Statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
            <p className="text-sm text-gray-500">Registered users</p>
            <p className="mt-3 text-3xl font-bold">{totalUsers}</p>
            <p className="mt-2 text-xs text-gray-600">
              Matching current filters
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-[#111119] p-5">
            <p className="text-sm text-gray-500">Verified users in results</p>
            <p className="mt-3 text-3xl font-bold text-violet-300">
              {users.filter((user) => user.is_verified).length}
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Currently displayed page
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Search and filters */}
        <section className="mb-6 rounded-2xl border border-white/[0.07] bg-[#111119] p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400">
                Search users
              </label>
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Name, email or country..."
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-violet-500/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400">
                Account role
              </label>
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value);
                  setPage(0);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#171722] px-4 py-3 text-sm text-white outline-none focus:border-violet-500/50"
              >
                <option value="all">All users</option>
                <option value="streamer">Streamers</option>
                <option value="clipper">Clippers</option>
              </select>
            </div>
          </div>
        </section>

        {/* User list */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111119]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] p-5">
            <div>
              <h3 className="font-semibold">Registered accounts</h3>
              <p className="mt-1 text-xs text-gray-500">
                {totalUsers} matching accounts
              </p>
            </div>
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400" />
              <p className="text-sm text-gray-400">
                Loading registered users...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mb-4 text-4xl">◇</div>
              <h3 className="font-semibold">No users found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try changing your search or role filter.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider text-gray-500">
                      <th className="px-5 py-4">User</th>
                      <th className="px-5 py-4">Role</th>
                      <th className="px-5 py-4">Activity</th>
                      <th className="px-5 py-4">Verification</th>
                      <th className="px-5 py-4">Joined</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.user_id}
                        className="border-b border-white/[0.04] transition hover:bg-white/[0.02]"
                      >
                        <td className="px-5 py-5">
                          <Link
                            href={`/admin/users/${user.user_id}`}
                            className="font-semibold transition hover:text-violet-300"
                          >
                            {user.full_name}
                            <span className="ml-2 text-xs text-violet-400">
                              View →
                            </span>
                          </Link>

                          <p className="mt-1 text-xs text-gray-500">
                            {user.email || "No email"}
                          </p>

                          <p className="mt-1 text-[10px] text-gray-600">
                            {user.country}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold capitalize text-violet-300">
                            {user.role}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-xs text-gray-400">
                          {user.role === "streamer" ? (
                            <>{user.campaign_count} campaigns</>
                          ) : (
                            <>
                              {user.submission_count} submissions
                              <p className="mt-1 text-[10px] text-gray-600">
                                {user.approved_submissions} approved
                              </p>
                            </>
                          )}
                        </td>

                        <td className="px-5 py-5">
                          {user.is_verified ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-300">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] text-gray-400">
                              Not verified
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-5 text-xs text-gray-500">
                          {formatDate(user.account_created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {users.map((user) => (
                  <Link
                    key={user.user_id}
                    href={`/admin/users/${user.user_id}`}
                    className="block rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold transition hover:text-violet-300">
                          {user.full_name}
                          <span className="ml-2 text-xs text-violet-400">
                            View →
                          </span>
                        </p>

                        <p className="mt-1 break-all text-xs text-gray-500">
                          {user.email || "No email"}
                        </p>
                      </div>

                      <span className="shrink-0 text-[10px] capitalize text-violet-300">
                        {user.role}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Activity</p>
                        <p className="mt-1 text-gray-300">
                          {user.role === "streamer"
                            ? `${user.campaign_count} campaigns`
                            : `${user.submission_count} submissions`}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Verification</p>
                        <p className="mt-1 text-gray-300">
                          {user.is_verified ? "✓ Verified" : "Not verified"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Country</p>
                        <p className="mt-1 text-gray-300">{user.country}</p>
                      </div>

                      <div>
                        <p className="text-gray-500">Joined</p>
                        <p className="mt-1 text-gray-300">
                          {formatDate(user.account_created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-white/[0.06] p-5">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Previous
            </button>

            <span className="text-xs text-gray-500">
              {users.length > 0
                ? `${page * pageSize + 1}–${page * pageSize + users.length} of ${totalUsers}`
                : "0 results"}
            </span>

            <button
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/[0.06] py-6 text-center">
          <p className="text-xs text-gray-600">
            ClipTN Administration · User management
          </p>
        </footer>
      </div>
    </main>
  );
}
