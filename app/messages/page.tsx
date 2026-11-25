
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string;
  streamer_id: string;
  clipper_id: string;
  campaign_id: string | null;
  submission_id: string | null;
  created_by: string;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type ProfileInfo = {
  id: string;
  full_name: string;
  role: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function MessagesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [campaigns, setCampaigns] = useState<Record<string, string>>({});
  const [selectedConversation, setSelectedConversation] =
    useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      setMessagesLoading(true);

      const { data, error: messageError } = await supabase
        .from("messages")
        .select(
          "id, conversation_id, sender_id, body, created_at, read_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (messageError) {
        console.error("Load messages error:", messageError);
        setError("Couldn't load messages. Please try again.");
        setMessagesLoading(false);
        return;
      }

      const loadedMessages = (data ?? []) as Message[];

      // Mark all incoming unread messages in this conversation as read.
      const unreadIds = loadedMessages
        .filter(
          (message) =>
            message.sender_id !== userId &&
            message.read_at === null
        )
        .map((message) => message.id);

      if (unreadIds.length > 0) {
        const readAt = new Date().toISOString();

        const { error: readError } = await supabase
          .from("messages")
          .update({ read_at: readAt })
          .in("id", unreadIds)
          .is("read_at", null);

        if (readError) {
          console.error("Mark messages as read error:", readError);
        } else {
          for (const message of loadedMessages) {
            if (unreadIds.includes(message.id)) {
              message.read_at = readAt;
            }
          }
        }
      }

      setMessages(loadedMessages);
      setMessagesLoading(false);
    },
    [supabase, userId]
  );

  useEffect(() => {
    let active = true;

    async function loadInbox() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);

      const { data: conversationData, error: conversationError } =
        await supabase
          .from("conversations")
          .select(
            "id, streamer_id, clipper_id, campaign_id, submission_id, created_by, created_at"
          )
          .or(
            `streamer_id.eq.${user.id},clipper_id.eq.${user.id}`
          )
          .order("created_at", { ascending: false });

      if (!active) return;

      if (conversationError) {
        setError("Couldn't load your inbox. Please refresh the page.");
        setLoading(false);
        return;
      }

      const inbox = (conversationData ?? []) as Conversation[];
      setConversations(inbox);

      if (inbox.length === 0) {
        setLoading(false);
        return;
      }

      const participantIds = [
        ...new Set(
          inbox.flatMap((conversation) => [
            conversation.streamer_id,
            conversation.clipper_id,
          ])
        ),
      ];

      const campaignIds = [
        ...new Set(
          inbox
            .map((conversation) => conversation.campaign_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const [accountResult, streamerResult, clipperResult, campaignResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("id", participantIds),

          supabase
            .from("streamer_profiles")
            .select("user_id, username, display_name, avatar_url")
            .in("user_id", participantIds)
            .eq("is_public", true),

          supabase
            .from("clipper_profiles")
            .select("user_id, username")
            .in("user_id", participantIds),

          campaignIds.length > 0
            ? supabase
                .from("campaigns")
                .select("id, title")
                .in("id", campaignIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (!active) return;

      const profileMap: Record<string, ProfileInfo> = {};

      for (const account of accountResult.data ?? []) {
        profileMap[account.id] = {
          id: account.id,
          full_name: account.full_name || "ClipTN member",
          role: account.role || "member",
          username: "",
          display_name: null,
          avatar_url: null,
        };
      }

      for (const streamer of streamerResult.data ?? []) {
        const existing = profileMap[streamer.user_id];

        if (existing) {
          existing.username = streamer.username || "";
          existing.display_name = streamer.display_name;
          existing.avatar_url = streamer.avatar_url;
        }
      }

      for (const clipper of clipperResult.data ?? []) {
        const existing = profileMap[clipper.user_id];

        if (existing) {
          existing.username = clipper.username || "";
        }
      }

      setProfiles(profileMap);

      if (campaignResult.data) {
        const campaignMap: Record<string, string> = {};

        for (const campaign of campaignResult.data) {
          campaignMap[campaign.id] = campaign.title;
        }

        setCampaigns(campaignMap);
      }

      setSelectedConversation(inbox[0].id);
      setLoading(false);
    }

    loadInbox();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (!selectedConversation || !userId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedConversation);

    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) {
              return current;
            }

            return [...current, newMessage];
          });

          // Automatically mark a newly received message as read
          // because this conversation is already open.
          if (
            newMessage.sender_id !== userId &&
            newMessage.read_at === null
          ) {
            const readAt = new Date().toISOString();

            void supabase
              .from("messages")
              .update({ read_at: readAt })
              .eq("id", newMessage.id)
              .is("read_at", null)
              .then(({ error: readError }) => {
                if (readError) {
                  console.error(
                    "Could not mark incoming message as read:",
                    readError
                  );
                  return;
                }

                setMessages((current) =>
                  current.map((message) =>
                    message.id === newMessage.id
                      ? { ...message, read_at: readAt }
                      : message
                  )
                );
              });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedConversation, userId, loadMessages, supabase]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();

    if (!body || !selectedConversation || !userId || sending) {
      return;
    }

    if (body.length > 5000) {
      setError("Messages cannot exceed 5,000 characters.");
      return;
    }

    setSending(true);
    setError("");

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation,
        sender_id: userId,
        body,
      })
      .select(
        "id, conversation_id, sender_id, body, created_at, read_at"
      )
      .single();

    if (sendError) {
      console.error("Send message error:", sendError);
      setError("Your message couldn't be sent. Please try again.");
      setSending(false);
      return;
    }

    const sentMessage = data as Message;

    setMessages((current) => {
      if (current.some((message) => message.id === sentMessage.id)) {
        return current;
      }

      return [...current, sentMessage];
    });

    setDraft("");
    setSending(false);
  }

  function getOtherParticipant(conversation: Conversation) {
    return conversation.streamer_id === userId
      ? conversation.clipper_id
      : conversation.streamer_id;
  }

  function getParticipant(participantId: string): ProfileInfo | undefined {
    return profiles[participantId];
  }

  function getParticipantName(participantId: string) {
    const profile = getParticipant(participantId);

    return (
      profile?.display_name ||
      profile?.full_name ||
      "ClipTN member"
    );
  }

  function getParticipantUsername(participantId: string) {
    const profile = getParticipant(participantId);

    return profile?.username
      ? `@${profile.username}`
      : "@username unavailable";
  }

  function getParticipantRole(participantId: string) {
    const role = getParticipant(participantId)?.role || "member";

    if (role === "streamer") return "Streamer";
    if (role === "clipper") return "Clipper";

    return role;
  }

  function getProfileUrl(participantId: string) {
    const profile = getParticipant(participantId);

    if (!profile?.username) return null;

    if (profile.role === "streamer") {
      return `/streamer/${encodeURIComponent(profile.username)}`;
    }

    if (profile.role === "clipper") {
      return `/clipper/${encodeURIComponent(profile.username)}`;
    }

    return null;
  }

  function getInitials(name: string) {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "CT"
    );
  }

  function ParticipantAvatar({
    participantId,
    size = "normal",
  }: {
    participantId: string;
    size?: "normal" | "large";
  }) {
    const profile = getParticipant(participantId);
    const name = getParticipantName(participantId);

    const sizeClass =
      size === "large"
        ? "h-12 w-12 rounded-2xl text-base"
        : "h-11 w-11 rounded-2xl text-sm";

    return (
      <div
        className={`participant-avatar flex shrink-0 items-center justify-center overflow-hidden font-bold text-violet-200 ${sizeClass}`}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={`${name}'s avatar`}
            className="h-full w-full object-cover"
          />
        ) : (
          getInitials(name)
        )}
      </div>
    );
  }

  function ParticipantIdentity({
    participantId,
    compact = false,
  }: {
    participantId: string;
    compact?: boolean;
  }) {
    const name = getParticipantName(participantId);
    const username = getParticipantUsername(participantId);
    const role = getParticipantRole(participantId);
    const profileUrl = getProfileUrl(participantId);

    const content = (
      <>
        <span className="block truncate text-sm font-bold text-zinc-100 transition group-hover:text-violet-200">
          {name}
        </span>
        <span className="mt-1 block truncate text-[11px] text-violet-300/80">
          {username}
        </span>
        {!compact && (
          <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            {role}
          </span>
        )}
      </>
    );

    if (profileUrl) {
      return (
        <Link
          href={profileUrl}
          title={`View ${name}'s ${role.toLowerCase()} profile`}
          className="group block min-w-0 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          {content}
        </Link>
      );
    }

    return <div className="min-w-0">{content}</div>;
  }

  const currentConversation = conversations.find(
    (conversation) => conversation.id === selectedConversation
  );

  const otherParticipantId = currentConversation
    ? getOtherParticipant(currentConversation)
    : "";

  return (
    <main className="messages-page relative isolate min-h-screen overflow-hidden bg-[#080810] text-white">
      <div className="messages-background pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="ambient-orb orb-purple" />
        <div className="ambient-orb orb-blue" />
        <div className="ambient-orb orb-bottom" />
        <div className="ambient-ribbon ribbon-left" />
        <div className="ambient-ribbon ribbon-right" />
        <div className="ambient-particles" />
        <div className="ambient-grid" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-violet-300"
            >
              ← Dashboard
            </Link>

            <h1 className="messages-title text-3xl font-black tracking-tight sm:text-5xl">
              Messages
            </h1>

            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
              Your private conversations on ClipTN.
            </p>
          </div>

          <div className="private-badge hidden rounded-2xl px-4 py-3 sm:block">
            <p className="text-sm font-bold text-violet-200">
              Private inbox
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Only conversation participants can access messages.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="messages-panel grid min-h-[650px] overflow-hidden rounded-3xl md:grid-cols-[320px_1fr]">
          <aside className="conversation-sidebar border-b border-white/[0.08] md:border-b-0 md:border-r">
            <div className="border-b border-white/[0.08] px-5 py-5">
              <h2 className="text-sm font-bold">Your conversations</h2>
              <p className="mt-1 text-xs text-zinc-400">
                {conversations.length} conversation
                {conversations.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="max-h-[300px] overflow-y-auto md:max-h-[600px]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="empty-icon mb-4 text-3xl">✉</div>
                  <p className="text-sm font-semibold text-zinc-200">
                    No conversations yet
                  </p>
                  <p className="mt-2 text-xs leading-6 text-zinc-400">
                    Your conversations with streamers and clippers will appear here.
                  </p>
                  <Link
                    href="/campaigns"
                    className="discover-button mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold text-white transition hover:scale-[1.03]"
                  >
                    <span>✦</span>
                    Discover campaigns
                  </Link>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const participantId = getOtherParticipant(conversation);
                  const selected =
                    selectedConversation === conversation.id;
                  const campaignTitle = conversation.campaign_id
                    ? campaigns[conversation.campaign_id]
                    : null;

                  return (
                    <div
                      key={conversation.id}
                      className={`conversation-item border-b border-white/[0.04] px-4 py-4 transition ${
                        selected
                          ? "conversation-selected"
                          : "hover:bg-white/[0.035]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedConversation(conversation.id)
                          }
                          aria-label={`Open conversation with ${getParticipantName(participantId)}`}
                          className="shrink-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                        >
                          <ParticipantAvatar participantId={participantId} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <ParticipantIdentity participantId={participantId} />
                          {campaignTitle && (
                            <p className="mt-2 truncate text-[10px] text-violet-300">
                              {campaignTitle}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedConversation(conversation.id)
                          }
                          aria-label="Open conversation"
                          className="rounded-lg px-2 py-2 text-lg text-zinc-500 transition hover:bg-white/5 hover:text-violet-300"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-w-0 flex-col">
            {currentConversation ? (
              <>
                <header className="chat-header flex flex-wrap items-center gap-3 border-b border-white/[0.08] px-5 py-4">
                  <ParticipantAvatar
                    participantId={otherParticipantId}
                    size="large"
                  />
                  <div className="min-w-0 flex-1">
                    <ParticipantIdentity participantId={otherParticipantId} />
                  </div>
                  {currentConversation.campaign_id &&
                    campaigns[currentConversation.campaign_id] && (
                      <div className="hidden max-w-[220px] truncate rounded-xl border border-violet-400/20 bg-violet-400/[0.08] px-3 py-2 text-[10px] text-violet-200 sm:block">
                        {campaigns[currentConversation.campaign_id]}
                      </div>
                    )}
                </header>

                <div className="chat-messages flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
                  {messagesLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
                      <div className="empty-icon mb-4 text-3xl">✉</div>
                      <p className="text-sm font-semibold text-zinc-200">
                        Start the conversation
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Send your first message below.
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_id === userId;

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`message-bubble max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                              mine
                                ? "message-mine rounded-br-md text-white"
                                : "message-theirs rounded-bl-md text-zinc-200"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.body}
                            </p>
                            <p
                              className={`mt-2 text-[9px] ${
                                mine
                                  ? "text-violet-200/70"
                                  : "text-zinc-400"
                              }`}
                            >
                              {new Date(message.created_at).toLocaleString(
                                undefined,
                                {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="chat-composer border-t border-white/[0.08] p-4 sm:p-5"
                >
                  <div className="composer-box flex items-end gap-3 rounded-2xl p-2">
                    <textarea
                      value={draft}
                      onChange={(event) =>
                        setDraft(event.target.value.slice(0, 5000))
                      }
                      placeholder="Write a message..."
                      rows={2}
                      maxLength={5000}
                      className="max-h-36 min-h-[48px] flex-1 resize-y bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      className="send-button mb-1 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sending ? "..." : "Send ↗"}
                    </button>
                  </div>
                  <p className="mt-2 px-1 text-[10px] text-zinc-500">
                    Keep your conversations respectful and relevant to ClipTN.
                  </p>
                </form>
              </>
            ) : (
              <div className="empty-chat flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="empty-envelope mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-3xl text-violet-200">
                  ✉
                </div>
                <h2 className="text-2xl font-bold">Your private inbox</h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-zinc-400">
                  Select a conversation to read messages. When you start
                  conversations with other ClipTN members, they'll appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .messages-page {
          background:
            radial-gradient(ellipse at 12% 0%, rgba(88, 28, 180, 0.12), transparent 36%),
            radial-gradient(ellipse at 95% 10%, rgba(25, 65, 200, 0.10), transparent 32%),
            #080810;
        }

        .messages-background { opacity: 0.95; }

        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.28;
          animation: orbFloat 14s ease-in-out infinite alternate;
        }

        .orb-purple {
          width: 460px;
          height: 460px;
          top: -220px;
          left: -150px;
          background: #7019ff;
        }

        .orb-blue {
          width: 500px;
          height: 500px;
          top: -180px;
          right: -220px;
          background: #143bff;
          animation-delay: -5s;
        }

        .orb-bottom {
          width: 550px;
          height: 400px;
          bottom: -280px;
          left: 35%;
          background: #5b0bff;
          animation-delay: -8s;
        }

        .ambient-ribbon {
          position: absolute;
          width: 65%;
          height: 280px;
          border-radius: 50%;
          border: 1px solid rgba(139, 55, 255, 0.12);
          filter: blur(1px);
          transform: rotate(-14deg);
        }

        .ribbon-left {
          top: 5%;
          left: -35%;
          box-shadow: 0 0 35px rgba(126, 34, 206, 0.08),
            inset 0 0 35px rgba(126, 34, 206, 0.05);
        }

        .ribbon-right {
          bottom: 0;
          right: -35%;
          border-color: rgba(59, 90, 255, 0.13);
          transform: rotate(-18deg);
          box-shadow: 0 0 40px rgba(59, 90, 255, 0.08),
            inset 0 0 35px rgba(59, 90, 255, 0.04);
        }

        .ambient-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(105, 68, 255, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(105, 68, 255, 0.055) 1px, transparent 1px);
          background-size: 70px 70px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
          opacity: 0.65;
        }

        .ambient-particles {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(2px 2px at 15% 25%, rgba(177, 110, 255, 0.8), transparent),
            radial-gradient(2px 2px at 75% 18%, rgba(93, 130, 255, 0.8), transparent),
            radial-gradient(3px 3px at 42% 65%, rgba(151, 67, 255, 0.7), transparent),
            radial-gradient(2px 2px at 85% 72%, rgba(108, 100, 255, 0.8), transparent),
            radial-gradient(2px 2px at 28% 82%, rgba(177, 110, 255, 0.7), transparent);
          background-size: 420px 380px;
          animation: particleDrift 35s linear infinite;
          opacity: 0.55;
        }

        .messages-title {
          background: linear-gradient(100deg, #fff 10%, #d9c5ff 48%, #a7baff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .private-badge {
          border: 1px solid rgba(153, 102, 255, 0.22);
          background: rgba(18, 15, 35, 0.65);
          backdrop-filter: blur(18px);
          box-shadow: 0 0 35px rgba(91, 33, 182, 0.08);
        }

        .messages-panel {
          border: 1px solid rgba(166, 119, 255, 0.18);
          background: rgba(12, 10, 22, 0.76);
          backdrop-filter: blur(22px);
          box-shadow: 0 0 55px rgba(91, 33, 182, 0.08),
            inset 0 0 35px rgba(91, 33, 182, 0.025);
        }

        .conversation-sidebar { background: rgba(12, 10, 22, 0.48); }

        .conversation-selected {
          background: linear-gradient(90deg, rgba(124, 58, 237, 0.16), rgba(124, 58, 237, 0.04));
          box-shadow: inset 2px 0 0 rgba(167, 139, 250, 0.8);
        }

        .participant-avatar {
          border: 1px solid rgba(167, 139, 250, 0.2);
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(59, 130, 246, 0.12));
        }

        .discover-button {
          border: 1px solid rgba(167, 139, 250, 0.3);
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.38), rgba(79, 70, 229, 0.22));
          box-shadow: 0 0 25px rgba(124, 58, 237, 0.12);
        }

        .chat-header { background: rgba(14, 12, 25, 0.45); }
        .chat-messages { background: rgba(7, 7, 14, 0.18); }

        .message-mine {
          background: linear-gradient(135deg, #7138d8, #5632b5);
          box-shadow: 0 5px 25px rgba(91, 33, 182, 0.15);
        }

        .message-theirs {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(10px);
        }

        .chat-composer { background: rgba(14, 12, 25, 0.55); }

        .composer-box {
          border: 1px solid rgba(167, 139, 250, 0.14);
          background: rgba(7, 7, 14, 0.72);
          transition: border-color 0.2s ease;
        }

        .composer-box:focus-within {
          border-color: rgba(167, 139, 250, 0.45);
          box-shadow: 0 0 25px rgba(124, 58, 237, 0.08);
        }

        .send-button {
          background: linear-gradient(135deg, #7c3aed, #5b35c9);
          box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
        }

        .empty-icon {
          color: #b794ff;
          text-shadow: 0 0 22px rgba(167, 139, 250, 0.45);
        }

        .empty-envelope {
          border: 1px solid rgba(167, 139, 250, 0.2);
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.14), rgba(59, 130, 246, 0.08));
          box-shadow: 0 0 35px rgba(124, 58, 237, 0.12),
            inset 0 0 25px rgba(124, 58, 237, 0.06);
          text-shadow: 0 0 20px rgba(167, 139, 250, 0.5);
        }

        @keyframes orbFloat {
          0% { transform: translate3d(0, 0, 0) scale(1); }
          100% { transform: translate3d(60px, 35px, 0) scale(1.15); }
        }

        @keyframes particleDrift {
          0% { background-position: 0 0; }
          100% { background-position: 420px 380px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ambient-orb, .ambient-particles { animation: none; }
        }
      `}</style>
    </main>
  );
}
