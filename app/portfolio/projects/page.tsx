
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = {
  id: string;
  clipper_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string | null;
  platform: string | null;
  is_published: boolean;
  is_featured: boolean;
  sort_order: number;
};

type ProjectForm = {
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  platform: string;
};

const emptyForm: ProjectForm = {
  title: "",
  description: "",
  video_url: "",
  thumbnail_url: "",
  category: "",
  platform: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0d0c15] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50";

const labelClass = "mb-2 block text-sm font-semibold text-zinc-300";

const selectClass =
  "w-full rounded-xl border border-white/10 bg-[#0d0c15] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50";

const projectFields =
  "id, clipper_id, title, description, video_url, thumbnail_url, category, platform, is_published, is_featured, sort_order";

function isValidWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function PortfolioProjectsPage() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ProjectForm>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProjects = useCallback(async (clipperId: string) => {
    const supabase = createClient();

    const { data, error: fetchError } = await supabase
      .from("portfolio_projects")
      .select(projectFields)
      .eq("clipper_id", clipperId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Unable to load projects: " + fetchError.message);
      return;
    }

    setProjects((data ?? []) as Project[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      const id = authData.user.id;
      setUserId(id);

      const { data: account } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (!account || account.role !== "clipper") {
        router.replace("/dashboard");
        return;
      }

      const { data: portfolio, error: portfolioError } =
        await supabase
          .from("clipper_profiles")
          .select("user_id")
          .eq("user_id", id)
          .maybeSingle();

      if (!active) return;

      if (portfolioError || !portfolio) {
        setError(
          "Create and save your portfolio profile before adding projects."
        );
        setLoading(false);
        return;
      }

      await loadProjects(id);

      if (active) setLoading(false);
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router, loadProjects]);

  function updateForm(field: keyof ProjectForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function startNewProject() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEditing(project: Project) {
    setForm({
      title: project.title,
      description: project.description ?? "",
      video_url: project.video_url,
      thumbnail_url: project.thumbnail_url ?? "",
      category: project.category ?? "",
      platform: project.platform ?? "",
    });

    setEditingId(project.id);
    setError("");
    setSuccess("");
    setShowForm(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const title = form.title.trim();
    const videoUrl = form.video_url.trim();
    const thumbnailUrl = form.thumbnail_url.trim();

    if (!title || title.length > 100) {
      setError("Project title must be between 1 and 100 characters.");
      return;
    }

    if (!isValidWebUrl(videoUrl)) {
      setError("Enter a valid video URL beginning with https:// or http://");
      return;
    }

    if (thumbnailUrl && !isValidWebUrl(thumbnailUrl)) {
      setError("Your thumbnail must be a valid image URL.");
      return;
    }

    if (form.description.length > 2000) {
      setError("Description cannot exceed 2000 characters.");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    const payload = {
      title,
      description: form.description.trim() || null,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl || null,
      category: form.category.trim() || null,
      platform: form.platform.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let saveError;

    if (editingId) {
      const result = await supabase
        .from("portfolio_projects")
        .update(payload)
        .eq("id", editingId)
        .eq("clipper_id", userId);

      saveError = result.error;
    } else {
      const result = await supabase
        .from("portfolio_projects")
        .insert({
          ...payload,
          clipper_id: userId,
          is_published: false,
          is_featured: false,
        });

      saveError = result.error;
    }

    if (saveError) {
      setError("Unable to save project: " + saveError.message);
      setSaving(false);
      return;
    }

    await loadProjects(userId);

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSuccess(
      editingId
        ? "Your project has been updated."
        : "Your project has been added as a draft."
    );
  }

  async function togglePublished(project: Project) {
    setError("");
    setSuccess("");
    setActionId(project.id);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("portfolio_projects")
      .update({
        is_published: !project.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("clipper_id", userId);

    if (updateError) {
      setError("Unable to update publishing status: " + updateError.message);
    } else {
      await loadProjects(userId);
      setSuccess(
        project.is_published
          ? "Project unpublished. It is no longer visible publicly."
          : "Project published! It is now visible on your public portfolio."
      );
    }

    setActionId(null);
  }

  async function toggleFeatured(project: Project) {
    setError("");
    setSuccess("");
    setActionId(project.id);

    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("portfolio_projects")
      .update({
        is_featured: !project.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", project.id)
      .eq("clipper_id", userId);

    if (updateError) {
      setError("Unable to update featured status: " + updateError.message);
    } else {
      await loadProjects(userId);
      setSuccess(
        project.is_featured
          ? "Project removed from featured."
          : "Project marked as featured."
      );
    }

    setActionId(null);
  }

  async function deleteProject(project: Project) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setActionId(project.id);

    const supabase = createClient();

    const { error: deleteError } = await supabase
      .from("portfolio_projects")
      .delete()
      .eq("id", project.id)
      .eq("clipper_id", userId);

    if (deleteError) {
      setError("Unable to delete project: " + deleteError.message);
    } else {
      await loadProjects(userId);
      setSuccess("Project deleted successfully.");
    }

    setActionId(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080810] text-white">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-[3px] border-violet-950 border-t-violet-400" />
          <p className="text-sm text-zinc-400">
            Loading your projects...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810] px-5 py-10 text-white sm:px-8">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-700/10 blur-[130px]" />

      <div className="relative mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/dashboard" className="text-2xl font-black tracking-tight">
            Clip<span className="text-violet-400">TN</span>
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/portfolio"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
            >
              Edit profile
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.08]"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Creator workspace
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Your project{" "}
              <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                library.
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Add your best edits, organize your work and show streamers
              what you can create.
            </p>
          </div>

          <button
            onClick={startNewProject}
            className="rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            + Add project
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {showForm && (
          <section className="mb-8 rounded-3xl border border-violet-400/20 bg-[#151320] p-6 sm:p-8">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit project" : "Add a new project"}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Fill in the details of your work.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className={labelClass}>Project title *</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  maxLength={100}
                  placeholder="Example: Best moments from a gaming stream"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Video URL *</label>
                <input
                  className={inputClass}
                  type="url"
                  value={form.video_url}
                  onChange={(e) => updateForm("video_url", e.target.value)}
                  placeholder="https://youtube.com/..."
                  required
                />
                <p className="mt-2 text-[11px] text-zinc-600">
                  Paste a link to your published video. This version opens
                  the video on its original platform.
                </p>
              </div>

              <div>
                <label className={labelClass}>Thumbnail image URL</label>
                <input
                  className={inputClass}
                  type="url"
                  value={form.thumbnail_url}
                  onChange={(e) => updateForm("thumbnail_url", e.target.value)}
                  placeholder="https://example.com/thumbnail.jpg"
                />
                <p className="mt-2 text-[11px] text-zinc-600">
                  Optional. Use a direct image URL.
                </p>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  maxLength={2000}
                  placeholder="Describe the project, your editing approach and what makes it special..."
                />
                <p className="mt-2 text-right text-[11px] text-zinc-600">
                  {form.description.length}/2000
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Platform</label>
                  <select
                    className={selectClass}
                    value={form.platform}
                    onChange={(e) => updateForm("platform", e.target.value)}
                  >
                    <option value="">Select platform</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="YouTube Shorts">YouTube Shorts</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Twitch">Twitch</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    className={selectClass}
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                  >
                    <option value="">Select category</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Podcast">Podcast</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Education">Education</option>
                    <option value="Sports">Sports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-bold transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Create project"}
                </button>

                <button
                  type="button"
                  onClick={cancelForm}
                  className="rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-5">
            <p className="text-xs text-zinc-500">Total projects</p>
            <p className="mt-2 text-3xl font-black">{projects.length}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#12111b] p-5">
            <p className="text-xs text-zinc-500">Published</p>
            <p className="mt-2 text-3xl font-black text-emerald-300">
              {projects.filter((p) => p.is_published).length}
            </p>
          </div>

          <div className="col-span-2 rounded-2xl border border-white/[0.07] bg-[#12111b] p-5 sm:col-span-1">
            <p className="text-xs text-zinc-500">Featured</p>
            <p className="mt-2 text-3xl font-black text-violet-300">
              {projects.filter((p) => p.is_featured).length}
            </p>
          </div>
        </section>

        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#12111b]/60 px-6 py-16 text-center">
            <div className="mb-5 text-5xl">🎬</div>
            <h2 className="text-xl font-bold">Your portfolio starts here.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
              Add your first project to show streamers your editing skills.
              Your work will appear publicly once you publish it.
            </p>
            <button
              onClick={startNewProject}
              className="mt-7 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold transition hover:bg-violet-500"
            >
              Add your first project
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <article
                key={project.id}
                className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12111b] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-950 to-[#080810] sm:w-52">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-violet-300/50">
                        ▶
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                          project.is_published
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-amber-400/10 text-amber-300"
                        }`}
                      >
                        {project.is_published ? "PUBLISHED" : "DRAFT"}
                      </span>

                      {project.is_featured && (
                        <span className="rounded-full bg-violet-400/10 px-3 py-1 text-[10px] font-bold text-violet-300">
                          ★ FEATURED
                        </span>
                      )}
                    </div>

                    <h3 className="break-words text-lg font-bold">
                      {project.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {project.platform && (
                        <span className="text-xs text-violet-300">
                          {project.platform}
                        </span>
                      )}
                      {project.category && (
                        <span className="text-xs text-zinc-500">
                          · {project.category}
                        </span>
                      )}
                    </div>

                    {project.description && (
                      <p className="mt-3 line-clamp-2 text-xs leading-6 text-zinc-500">
                        {project.description}
                      </p>
                    )}

                    <a
                      href={project.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs font-semibold text-violet-300 hover:text-violet-200"
                    >
                      Open video ↗
                    </a>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
                  <button
                    onClick={() => startEditing(project)}
                    disabled={actionId === project.id}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => togglePublished(project)}
                    disabled={actionId === project.id}
                    className="rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-400/10 disabled:opacity-50"
                  >
                    {actionId === project.id
                      ? "Please wait..."
                      : project.is_published
                        ? "Unpublish"
                        : "Publish"}
                  </button>

                  <button
                    onClick={() => toggleFeatured(project)}
                    disabled={actionId === project.id}
                    className="rounded-lg border border-violet-400/20 bg-violet-400/[0.05] px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-400/10 disabled:opacity-50"
                  >
                    {project.is_featured
                      ? "Remove featured"
                      : "★ Feature"}
                  </button>

                  <button
                    onClick={() => deleteProject(project)}
                    disabled={actionId === project.id}
                    className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <footer className="mt-12 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} ClipTN. Built for creators.
        </footer>
      </div>
    </main>
  );
}
