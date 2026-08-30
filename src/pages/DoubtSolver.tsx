/**
 * DoubtSolver.tsx  —  updated for unified left-sidebar layout
 *
 * Changes from the previous version:
 *  1. Removed <SiteHeader /> (top navbar gone entirely)
 *  2. Navigation now lives in <AppSidebar /> on the left
 *  3. The old internal <aside> is replaced by <AppSidebar featureSlot={...} />
 *  4. Main content area is cleaner — no redundant header bar
 *  5. Everything stays in one `flex h-screen` root — no nested scroll issues
 *  6. Chat column + input bar now share the same max-w-3xl width (was
 *     max-w-[50em] vs max-w-[40rem] — mismatched units caused misalignment)
 *  7. Assistant response typography reworked for ChatGPT/Gemini-style
 *     spacing, indentation, and readability (font stack, prose tuning)
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  HelpCircle,
  Plus,
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { DeleteModal } from "../components/DeleteModal";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";
import {
  createThread,
  deleteThread,
  getThreadMessages,
  listThreads,
  type Thread,
} from "../lib/threads";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Explain recursion with a real example",
  "What is Big O notation?",
  "Difference between TCP and UDP",
  "How does React reconciliation work?",
  "What are pointers in C++?",
  "Explain probability with a coin flip example",
];

// ─── Component ────────────────────────────────────────────────────────────────

function DoubtSolver() {
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId: string }>();

  const [user, setUser] = useState({ name: "You", email: "", avatarUrl: "" });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [chatToDelete, setChatToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  useEffect(() => {
    const textarea = inputRef.current;

    if (!textarea) return;

    // Reset height first so it can shrink when text is deleted
    textarea.style.height = "0px";

    // Grow with content, up to 160px
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  const activeThread = threads.find((t) => t.id === threadId);

  // ── Load current user ────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const u = session.user;
      setUser({
        name:
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          u.email?.split("@")[0] ??
          "You",
        email: u.email ?? "",
        avatarUrl: u.user_metadata?.avatar_url ?? "",
      });
    });
  }, []);

  // ── Load thread list ─────────────────────────────────────────────────────────

  async function loadThreads() {
    try {
      setLoadingThreads(true);
      const data = await listThreads("doubt");
      setThreads(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load chats");
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);

  // ── Load messages (isMounted guard prevents stale overwrites) ────────────────

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    getThreadMessages(threadId)
      .then((data) => {
        if (!isMounted) return;
        setMessages((current) => {
          if (current.length > 0 && data.messages.length === 0) return current;
          return data.messages.map((m) => ({
            id: m.id,
            role: m.role as Message["role"],
            content: m.content,
          }));
        });
      })
      .catch(() => {
        if (isMounted) toast.error("Failed to load messages");
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [threadId]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [threadId, sending]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleNewChat() {
    navigate("/doubt-solver");
  }

  // 1. Update the delete handler in the Sidebar to open the modal instead
  function handleDeleteClick(id: string, title: string) {
    setChatToDelete({ id, title });
  }

  // 2. Create the actual confirmation function
  async function confirmDelete() {
    if (!chatToDelete) return;
    try {
      await deleteThread(chatToDelete.id);
      setThreads((ts) => ts.filter((t) => t.id !== chatToDelete.id));
      if (threadId === chatToDelete.id) navigate("/doubt-solver");
      toast.success("Chat deleted");
    } catch {
      toast.error("Failed to delete chat");
    } finally {
      setChatToDelete(null); // Close modal
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setStreamingText("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((current) => [...current, userMessage]);

    try {
      let currentThreadId = threadId;

      if (!currentThreadId) {
        const newThread = await createThread("doubt");
        currentThreadId = newThread.id;
        navigate(`/doubt-solver/${currentThreadId}`, { replace: true });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in");

      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          threadId: currentThreadId,
          messages: apiMessages,
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to AI server");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream not available");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // 1. Break the fast chunk into smaller pieces to force a smooth typewriter effect
        for (let i = 0; i < chunk.length; i += 2) {
          fullText += chunk.substring(i, i + 2);

          // 2. Removed .trim() here! Trailing spaces/newlines are now preserved while typing,
          // stopping markdown blocks from collapsing or smashing together.
          setStreamingText(fullText.replace(/<<<SCORES[\s\S]*?>>>/gi, ""));

          // 3. Add a micro-delay (5ms) to pace the text rendering
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      // 4. We only apply .trim() at the very end when saving the final message
      const finalText = fullText.replace(/<<<SCORES[\s\S]*?>>>/gi, "").trim();

      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: finalText },
      ]);
      setStreamingText("");

      await loadThreads();
      setTimeout(() => loadThreads(), 1500);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to send");
      setMessages((current) => current.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  }

  const showEmptyState = !threadId && messages.length === 0 && !sending;

  // ─────────────────────────────────────────────────────────────────────────────
  // Feature slot — passed into AppSidebar
  // ─────────────────────────────────────────────────────────────────────────────

  const featureSlot = ({ searchQuery }: { searchQuery: string }) => {
    const filteredThreads = threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-20 bg-white/95 px-4 py-2 backdrop-blur dark:bg-gray-950/95">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="space-y-0.5 px-2 pb-3">
          {loadingThreads ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">
              {searchQuery ? "No matching chats" : "No chats yet"}
            </p>
          ) : (
            filteredThreads.map((thread) => {
              const active = thread.id === threadId;
              return (
                <div
                  key={thread.id}
                  className={`group flex items-center rounded-lg transition-colors ${
                    active
                      ? "bg-violet-50 dark:bg-violet-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <button
                    onClick={() => navigate(`/doubt-solver/${thread.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    <MessageSquare
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active
                          ? "text-violet-600 dark:text-violet-400"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        active
                          ? "font-medium text-violet-700 dark:text-violet-300"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {thread.title}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(thread.id, thread.title)}
                    className="mr-1.5 shrink-0 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* ── Sidebar (navigation + feature slot + user) ──────────────────────── */}
      <AppSidebar user={user} featureSlot={featureSlot} />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Soft ambient glow bleeding in from the top/bottom edges — purely
            decorative, sits behind everything (-z-10), same trick already
            used below for the empty-state wash. */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-48 w-full max-w-[44rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/10" />
        <div className="pointer-events-none absolute -bottom-8 left-1/2 -z-10 h-24 w-full max-w-[44rem] -translate-x-1/2 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/10" />
        {/* Subtle active-thread label — replaces the old header bar */}
        {activeThread && (
          <div className="flex items-center gap-2 border-b border-gray-100 bg-white/80 px-6 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
            <Brain className="h-4 w-4 shrink-0 text-violet-500" />
            <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {activeThread.title}
            </span>
          </div>
        )}

        {/* Messages / Empty state */}
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,black_32px,black_calc(100%-24px),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_32px,black_calc(100%-24px),transparent)]"
        >
          {showEmptyState && (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 dark:from-violet-950/10 dark:via-gray-950 dark:to-purple-950/10" />
          )}

          {/* NOTE: max-w-3xl — kept identical to the input bar's max-w below
              so the chat column and input bar are perfectly center-aligned. */}
          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
            {showEmptyState ? (
              /* ── Empty / welcome state ── */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  AI Doubt Solver
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-gray-500 dark:text-gray-400">
                  Ask anything across programming, aptitude, mathematics,
                  communication, and academics.
                </p>

                {/* Suggestion chips */}
                <div className="mt-7 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      className="rounded-full border border-violet-200 bg-white px-4 py-2 text-sm text-violet-700 transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-transparent dark:text-violet-300 dark:hover:bg-violet-900/30"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingMessages ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} />
                ))}
                {sending && (
                  <MessageBubble
                    role="assistant"
                    content={streamingText}
                    loading={!streamingText}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Input bar ─────────────────────────────────────────────────────── */}
        <div className="bg-white/80 px-4 pb-5 pt-3 backdrop-blur-sm dark:bg-gray-950/80">
          {/* NOTE: max-w-3xl — matches the messages column above so the
              search/input bar sits perfectly centered under the chat. */}
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-4xl bg-white px-4 py-3 shadow-sm transition-all focus-within:shadow-md dark:bg-gray-900">
              {" "}
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your question…"
                disabled={sending}
                style={{ fontFamily: "var(--font-chat)" }}
                className="min-h-[36px] max-h-40 flex-1 resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-600"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-600">
              SpeakWise AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
      <DeleteModal
        isOpen={!!chatToDelete}
        chatTitle={chatToDelete?.title || ""}
        onClose={() => setChatToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ─── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  role,
  content,
  loading = false,
}: {
  role: Message["role"];
  content: string;
  loading?: boolean;
}) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-[11px] font-bold text-white shadow-sm">
          AI
        </div>
      )}

      <div
        className={
          isUser
            ? "max-w-[72%] rounded-3xl rounded-tr-md bg-gradient-to-br from-violet-600/90 to-purple-500/90 px-5 py-3 text-white shadow-md"
            : "max-w-[80%]"
        }
      >
        {loading ? (
          <div className="flex items-center gap-1.5 py-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-violet-400"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        ) : isUser ? (
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ fontFamily: "var(--font-chat)" }}
          >
            {content}
          </p>
        ) : (
          <div
            style={{ fontFamily: "var(--font-chat)" }}
            className="
              prose prose-base dark:prose-invert max-w-none break-words
              text-[16.4px] leading-[1.75] text-gray-800 dark:text-gray-200

              prose-p:leading-[1.75] prose-p:my-4 first:[&>*]:mt-0 last:[&>*]:mb-0

              prose-headings:font-semibold prose-headings:text-gray-900
              dark:prose-headings:text-white prose-headings:tracking-tight
              prose-h1:text-xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2

              prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6
              prose-li:my-2 prose-li:leading-[1.75] prose-li:pl-1
              [&_li>ul]:my-2 [&_li>ol]:my-2
              marker:text-gray-400 dark:marker:text-gray-500

              prose-strong:font-semibold prose-strong:text-gray-900
              dark:prose-strong:text-white

              prose-blockquote:border-l-[3px] prose-blockquote:border-violet-500
              prose-blockquote:bg-violet-50 dark:prose-blockquote:bg-violet-950/20
              prose-blockquote:rounded-r-lg prose-blockquote:py-2
              prose-blockquote:pl-4 prose-blockquote:not-italic prose-blockquote:my-5
              [&_blockquote>p]:my-0

              prose-hr:my-7 prose-hr:border-gray-200 dark:prose-hr:border-gray-700

              prose-a:text-violet-600 dark:prose-a:text-violet-400 prose-a:no-underline
              hover:prose-a:underline

              [&_table]:border-collapse [&_table]:text-sm [&_table]:my-5
              [&_table]:w-full
              [&_th]:border [&_th]:border-gray-200 [&_th]:bg-violet-50/80
              [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-semibold [&_th]:text-left
              [&_td]:border [&_td]:border-gray-200 [&_td]:px-3 [&_td]:py-2.5
              dark:[&_th]:border-gray-700 dark:[&_th]:bg-violet-950/30
              dark:[&_td]:border-gray-700
            "
          >
            <ReactMarkdown
              components={{
                code(props) {
                  const { children, className, ref, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      {...(rest as any)}
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                      className="!my-4 !rounded-xl !text-sm !shadow-md"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      ref={ref}
                      {...rest}
                      className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-sm text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoubtSolver;
