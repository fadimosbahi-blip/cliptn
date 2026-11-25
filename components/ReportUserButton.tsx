
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ReportUserButtonProps = {
  reportedUserId: string;
  reportedUsername: string;
};

type SelectedEvidence = {
  file: File;
  preview: string;
};

const categories = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "scamming_fraud", label: "Scamming or fraud" },
  { value: "copyright_violation", label: "Copyright violation" },
  { value: "fake_engagement", label: "Fake engagement" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default function ReportUserButton({
  reportedUserId,
  reportedUsername,
}: ReportUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [category, setCategory] = useState("harassment");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<
    SelectedEvidence[]
  >([]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkUser() {
      const supabase = createClient();

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      setCurrentUserId(error ? null : user?.id ?? null);
      setCheckingUser(false);
    }

    void checkUser();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      selectedEvidence.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
  }, [selectedEvidence]);

  function handleEvidenceChange(event: ChangeEvent<HTMLInputElement>) {
    setMessage("");

    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    if (files.length + selectedEvidence.length > MAX_FILES) {
      setMessage(`You can attach a maximum of ${MAX_FILES} screenshots.`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES[file.type]) {
        setMessage("Only JPG, PNG and WEBP images are supported.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setMessage(`${file.name} exceeds the 5 MB image limit.`);
        return;
      }

      if (file.size === 0) {
        setMessage(`${file.name} is empty and cannot be uploaded.`);
        return;
      }
    }

    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedEvidence((current) => [...current, ...newItems]);
  }

  function removeEvidence(index: number) {
    setSelectedEvidence((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  async function uploadEvidence(
    userId: string,
    files: File[],
    supabase: ReturnType<typeof createClient>
  ): Promise<string[]> {
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const extension = ALLOWED_TYPES[file.type];

      if (!extension) {
        throw new Error("An unsupported image type was selected.");
      }

      const path = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("report-evidence")
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        throw new Error(`Screenshot upload failed: ${error.message}`);
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function removeUploadedEvidence(
    paths: string[],
    supabase: ReturnType<typeof createClient>
  ) {
    if (paths.length === 0) return;

    await supabase.storage.from("report-evidence").remove(paths);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setMessage("");
    setSuccess(false);

    if (!currentUserId) {
      setMessage("Please log in before submitting a report.");
      return;
    }

    if (currentUserId === reportedUserId) {
      setMessage("You cannot report your own profile.");
      return;
    }

    if (description.trim().length < 10) {
      setMessage("Please explain the issue in at least 10 characters.");
      return;
    }

    if (description.trim().length > 5000) {
      setMessage("Your description cannot exceed 5,000 characters.");
      return;
    }

    if (selectedEvidence.length > MAX_FILES) {
      setMessage(`You can attach a maximum of ${MAX_FILES} screenshots.`);
      return;
    }

    const cleanedEvidenceUrl = evidenceUrl.trim();

    if (cleanedEvidenceUrl) {
      try {
        const parsedUrl = new URL(cleanedEvidenceUrl);

        if (
          parsedUrl.protocol !== "https:" &&
          parsedUrl.protocol !== "http:"
        ) {
          setMessage("Evidence links must use HTTP or HTTPS.");
          return;
        }
      } catch {
        setMessage("Please enter a valid evidence URL.");
        return;
      }
    }

    setSubmitting(true);

    const supabase = createClient();
    let uploadedPaths: string[] = [];

    try {
      // Upload screenshots into the reporter's private storage folder.
      if (selectedEvidence.length > 0) {
        uploadedPaths = await uploadEvidence(
          currentUserId,
          selectedEvidence.map((item) => item.file),
          supabase
        );
      }

      // Create the report using the existing reporting RPC.
      const { data, error } = await supabase.rpc("submit_user_report", {
        p_reported_user_id: reportedUserId,
        p_category: category,
        p_description: description.trim(),
        p_evidence_url: cleanedEvidenceUrl || null,
      });

      if (error) {
        await removeUploadedEvidence(uploadedPaths, supabase);
        setMessage(error.message || "We couldn't submit your report.");
        return;
      }

      if (!data || typeof data !== "string") {
        await removeUploadedEvidence(uploadedPaths, supabase);
        setMessage("The report could not be confirmed. Please try again.");
        return;
      }

      // Attach uploaded paths to the newly created report.
      if (uploadedPaths.length > 0) {
        const { error: attachError } = await supabase.rpc(
          "attach_report_evidence",
          {
            p_report_id: data,
            p_evidence_paths: uploadedPaths,
          }
        );

        if (attachError) {
          await removeUploadedEvidence(uploadedPaths, supabase);

          setSuccess(true);
          setMessage(
            "Your report was submitted, but the screenshots could not be attached. Please contact the moderation team."
          );

          setDescription("");
          setEvidenceUrl("");
          setCategory("harassment");
          setSelectedEvidence([]);
          return;
        }
      }

      setSuccess(true);
      setMessage(
        "Your report and evidence have been submitted. Our moderation team will review them."
      );

      setDescription("");
      setEvidenceUrl("");
      setCategory("harassment");
      setSelectedEvidence([]);
    } catch (error) {
      await removeUploadedEvidence(uploadedPaths, supabase);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingUser || currentUserId === reportedUserId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage("");
          setSuccess(false);
          setOpen(true);
        }}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:border-red-400/40 hover:bg-red-500/[0.12] hover:text-red-200"
      >
        <span aria-hidden="true">⚑</span>
        Report User
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) {
              setOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-user-title"
            className="my-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#10101c] shadow-[0_30px_100px_rgba(0,0,0,.65)]"
          >
            <div className="border-b border-white/[0.08] bg-gradient-to-r from-red-500/[0.10] via-violet-500/[0.08] to-transparent px-6 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/20 bg-red-500/10 text-xl text-red-300">
                    ⚑
                  </div>

                  <h2
                    id="report-user-title"
                    className="text-xl font-black text-white"
                  >
                    Report this user
                  </h2>

                  <p className="mt-2 text-sm text-zinc-400">
                    Report{" "}
                    <span className="font-semibold text-violet-300">
                      @{reportedUsername}
                    </span>{" "}
                    to the ClipTN moderation team.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => !submitting && setOpen(false)}
                  disabled={submitting}
                  aria-label="Close report form"
                  className="rounded-lg border border-white/10 px-3 py-2 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-7">
              <div>
                <label
                  htmlFor="report-category"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400"
                >
                  Reason for reporting
                </label>

                <select
                  id="report-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={submitting || success}
                  className="w-full rounded-xl border border-white/10 bg-[#171725] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50 disabled:opacity-60"
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-description"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400"
                >
                  What happened?
                </label>

                <textarea
                  id="report-description"
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={submitting || success}
                  placeholder="Please describe the issue clearly. Include relevant details that could help our team investigate..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-[#171725] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 disabled:opacity-60"
                />

                <p className="mt-2 text-right text-[11px] text-zinc-600">
                  {description.length}/5000
                </p>
              </div>

              <div>
                <label
                  htmlFor="report-evidence"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400"
                >
                  Evidence link{" "}
                  <span className="font-normal normal-case text-zinc-600">
                    (optional)
                  </span>
                </label>

                <input
                  id="report-evidence"
                  type="url"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  disabled={submitting || success}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-[#171725] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/50 disabled:opacity-60"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  You can include a link to relevant content or evidence.
                </p>
              </div>

              {/* Screenshot evidence */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="report-screenshots"
                    className="block text-xs font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Screenshot evidence
                  </label>

                  <span className="text-[11px] text-zinc-600">
                    {selectedEvidence.length}/{MAX_FILES} images
                  </span>
                </div>

                <label
                  htmlFor="report-screenshots"
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition ${
                    submitting || success ||
                    selectedEvidence.length >= MAX_FILES
                      ? "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-50"
                      : "border-violet-400/25 bg-violet-500/[0.04] hover:border-violet-400/50 hover:bg-violet-500/[0.08]"
                  }`}
                >
                  <span className="mb-2 text-2xl text-violet-300">▧</span>
                  <span className="text-sm font-semibold text-gray-200">
                    Choose screenshots
                  </span>
                  <span className="mt-1 text-xs text-zinc-500">
                    JPG, PNG or WEBP · Up to 5 MB each
                  </span>
                  <span className="mt-1 text-[11px] text-zinc-600">
                    Attach up to 5 images
                  </span>
                </label>

                <input
                  id="report-screenshots"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={
                    submitting ||
                    success ||
                    selectedEvidence.length >= MAX_FILES
                  }
                  onChange={handleEvidenceChange}
                  className="sr-only"
                />

                {selectedEvidence.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedEvidence.map((item, index) => (
                      <div
                        key={`${item.file.name}-${index}`}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#09090f]"
                      >
                        <img
                          src={item.preview}
                          alt={`Evidence screenshot ${index + 1}`}
                          className="h-28 w-full object-cover"
                        />

                        <div className="p-2">
                          <p className="truncate text-[11px] text-gray-300">
                            {item.file.name}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-600">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeEvidence(index)}
                          disabled={submitting || success}
                          aria-label={`Remove ${item.file.name}`}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/75 text-sm text-white transition hover:bg-red-500 disabled:opacity-40"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Screenshots are stored privately and can only be accessed by
                  authorized ClipTN moderators.
                </p>
              </div>

              {message && (
                <div
                  role="status"
                  className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                    success
                      ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300"
                      : "border-red-400/20 bg-red-500/[0.08] text-red-300"
                  }`}
                >
                  {message}

                  {!currentUserId && (
                    <Link
                      href="/login"
                      className="ml-1 font-bold underline underline-offset-4"
                    >
                      Log in
                    </Link>
                  )}
                </div>
              )}

              {success ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-violet-500"
                >
                  Close
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-950/20 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting report...
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">⚑</span>
                      Submit Report
                    </>
                  )}
                </button>
              )}

              <p className="text-center text-[11px] leading-5 text-zinc-600">
                Reports are confidential and reviewed by the ClipTN
                moderation team.
              </p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
