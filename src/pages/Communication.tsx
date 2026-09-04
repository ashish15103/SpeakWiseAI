import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Languages,
  Plus,
  Send,
  Trash2,
  Loader2,
  MessageSquare,
  MoreVertical,
  Mic,
  MicOff,
  Volume2,
  Square,
  SquarePen,
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

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

const SUGGESTIONS = [
  "I want to talk about my career goals.",
  "Let's do a roleplay at a coffee shop.",
  "Give me a random daily topic to discuss.",
  "Help me improve my grammar in casual conversation.",
];

export default function Communication() {
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

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mobileAutoFollowRef = useRef(true);

  const [chatToDelete, setChatToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

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

  async function loadThreads() {
    try {
      setLoadingThreads(true);
      const data = await listThreads("communication");
      setThreads(data);
    } catch (err) {
      toast.error("Failed to load chats");
    } finally {
      setLoadingThreads(false);
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);

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

  function isNearBottom(element: HTMLDivElement) {
    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceFromBottom < 100;
  }

  function handleChatScroll() {
    const container = scrollRef.current;
    if (!container) return;

    // This behavior is intentionally limited to mobile so desktop scrolling
    // remains exactly as it was before.
    if (window.innerWidth < 768) {
      mobileAutoFollowRef.current = isNearBottom(container);
    }
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (window.innerWidth < 768 && !mobileAutoFollowRef.current) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!sending && !isListening && window.innerWidth >= 768)
      inputRef.current?.focus();
  }, [threadId, sending, isListening]);

  // Mobile only: when the composer gets focus (keyboard opening), nudge it
  // into view instead of letting the on-screen keyboard cover it. Desktop is
  // unaffected — nothing here changes desktop focus behavior.
  function handleInputFocus() {
    window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "nearest" });
    }, 80);
  }

  function handleNewChat() {
    navigate("/communication");
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

  // --- VOICE RECOGNITION LOGIC ---
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "Voice input isn't supported in your browser. Please try Chrome or Edge.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Store the existing input so we can append to it
    const existingInput = input.trim() ? input.trim() + " " : "";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      setInput(existingInput + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error", event);
      if (event.error !== "no-speech") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  async function handleSend() {
    // Stop listening if user sends manually while mic is on
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    mobileAutoFollowRef.current = true;
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
        const newThread = await createThread("communication");
        currentThreadId = newThread.id;
        navigate(`/communication/${currentThreadId}`, { replace: true });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You are not signed in");

      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        "https://speakwiseai-z1g2.onrender.com/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            threadId: currentThreadId,
            messages: apiMessages,
            feature: "communication",
          }),
        },
      );

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
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      setMessages((current) => current.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
    }
  }

  const showEmptyState = !threadId && messages.length === 0 && !sending;

  const featureSlot = ({ searchQuery }: { searchQuery: string }) => {
    const filteredThreads = threads.filter((thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
      <div className="flex flex-col">
        <div className="hidden px-4 pb-2 pt-3 md:block">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40">
              <MessageSquare className="h-3.5 w-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              Communication
            </p>
          </div>
        </div>

        <div className="sticky top-0 z-20 bg-white/95 px-4 py-2 backdrop-blur dark:bg-gray-950/95">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Practice
          </button>
        </div>

        <div className="space-y-0.5 px-2 pb-3">
          {loadingThreads ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">
              {searchQuery ? "No matching practices" : "No practices yet"}
            </p>
          ) : (
            filteredThreads.map((thread) => {
              const active = thread.id === threadId;
              return (
                <div
                  key={thread.id}
                  className={`group flex items-center rounded-lg transition-colors ${active ? "bg-fuchsia-50 dark:bg-fuchsia-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                >
                  <button
                    onClick={() => {
                      setMobileMenuId(null);
                      navigate(`/communication/${thread.id}`);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                  >
                    <MessageSquare
                      className={`h-3.5 w-3.5 shrink-0 ${active ? "text-fuchsia-600 dark:text-fuchsia-400" : "text-gray-400 dark:text-gray-600"}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${active ? "font-medium text-fuchsia-700 dark:text-fuchsia-300" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {thread.title}
                    </span>
                  </button>
                  {/* Desktop delete button — KEEP hover behavior */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteClick(thread.id, thread.title);
                    }}
                    aria-label={`Delete ${thread.title}`}
                    title="Delete chat"
                    className="
    mr-1.5 hidden h-7 w-7 shrink-0 items-center justify-center
    rounded-md
    text-gray-400
    opacity-0
    transition-opacity
    group-hover:opacity-100
    focus:opacity-100
    hover:bg-red-50
    hover:text-red-500
    dark:hover:bg-red-900/20
    dark:hover:text-red-400
    md:flex
  "
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Mobile three-dot menu */}
                  <div className="relative mr-1 md:hidden">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMobileMenuId((current) =>
                          current === thread.id ? null : thread.id,
                        );
                      }}
                      aria-label={`More options for ${thread.title}`}
                      aria-expanded={mobileMenuId === thread.id}
                      className="
      flex h-8 w-8 items-center justify-center
      rounded-lg
      text-gray-400
      transition-colors
      active:bg-gray-100
      active:text-gray-700
      dark:active:bg-gray-800
      dark:active:text-gray-200
    "
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>

                    {mobileMenuId === thread.id && (
                      <div
                        className="
        absolute right-0 top-9 z-50
        w-28 overflow-hidden
        rounded-xl
        border border-gray-200
        bg-white
        p-1
        shadow-xl
        dark:border-gray-700
        dark:bg-gray-900
      "
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuId(null);
                            handleDeleteClick(thread.id, thread.title);
                          }}
                          className="
          flex w-full items-center gap-2
          rounded-lg px-3 py-2
          text-left text-sm font-medium
          text-red-500
          transition-colors
          active:bg-red-50
          dark:active:bg-red-900/20
        "
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[100svh] overflow-hidden bg-white dark:bg-gray-950 md:h-screen">
      {" "}
      <AppSidebar user={user} featureSlot={featureSlot} />{" "}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {" "}
        {/* Mobile New Chat — belongs to the workspace interface, beside the
            floating profile button. Desktop remains unchanged. */}
        <button
          type="button"
          onClick={handleNewChat}
          aria-label="New practice"
          title="New practice"
          className="fixed right-[64px] top-4 z-[70] flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200/70 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 md:hidden dark:border-gray-800 dark:bg-gray-900/95 dark:text-gray-200 dark:ring-gray-800"
        >
          <SquarePen className="h-[18px] w-[18px]" />
        </button>
        {/* Soft ambient glow bleeding in from the top/bottom edges — purely
            decorative, sits behind everything (-z-10), same trick already
            used below for the empty-state wash. */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-48 w-full max-w-2xl -translate-x-1/2 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="pointer-events-none absolute -bottom-20 left-1/2 -z-10 h-48 w-full max-w-2xl -translate-x-1/2 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/10" />
        <div
          ref={scrollRef}
          onScroll={handleChatScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_32px,black_calc(100%-72px),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_32px,black_calc(100%-72px),transparent)]"
        >
          {showEmptyState && (
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-fuchsia-50/60 via-white to-pink-50/40 dark:from-fuchsia-950/10 dark:via-gray-950 dark:to-pink-950/10" />
          )}

          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-28 pt-24 sm:pb-8 md:pt-8">
            {" "}
            {showEmptyState ? (
              <div className="flex flex-col items-center justify-center py-6 text-center sm:py-10 md:py-16">
                {" "}
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white shadow-xl">
                  <Languages className="h-8 w-8" />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  Communication Practice
                </h1>
                <p className="mx-auto mt-3 max-w-md leading-relaxed text-gray-500 dark:text-gray-400">
                  Practice speaking fluently. Use the microphone to speak, and
                  click the speaker icon to listen to AI responses.
                </p>
                <div className="mt-6 flex w-full flex-col items-center gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center">
                  {" "}
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        inputRef.current?.focus();
                      }}
                      className="w-full max-w-sm rounded-full border border-fuchsia-200 bg-white px-4 py-2.5 text-center text-sm text-fuchsia-700 shadow-sm transition hover:border-fuchsia-400 hover:bg-fuchsia-50 active:scale-[0.98] dark:border-fuchsia-800 dark:bg-transparent dark:text-fuchsia-300 dark:hover:bg-fuchsia-900/30 sm:w-auto"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingMessages ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-fuchsia-600" />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    content={message.content}
                  />
                ))}

                {sending && (
                  <MessageBubble
                    role="assistant"
                    content={streamingText || "..."}
                    loading={!streamingText}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {/* Input Bar */}
        <div className="shrink-0 bg-white/80 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm md:pb-2 dark:bg-gray-950/80">
          {" "}
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all focus-within:border-fuchsia-300 focus-within:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-fuchsia-700 md:rounded-2xl">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                enterKeyHint="send"
                placeholder={
                  isListening
                    ? "Listening... speak now"
                    : "Type or click the microphone..."
                }
                disabled={sending}
                className="max-h-40 min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-600 md:min-h-[36px] md:text-sm"
              />

              {/* Mic Button */}
              <button
                onClick={toggleListening}
                disabled={sending}
                className={`flex h-11 w-11 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl transition-all ${isListening ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/40 dark:text-red-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"}`}
                title={isListening ? "Stop listening" : "Use microphone"}
              >
                {/* 👇 We are now using MicOff here when listening! 👇 */}
                {isListening ? (
                  <MicOff className="h-5 w-5 md:h-4 md:w-4" />
                ) : (
                  <Mic className="h-5 w-5 md:h-4 md:w-4" />
                )}
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || (!input.trim() && !isListening)}
                className="flex h-11 w-11 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-pink-500 text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin md:h-4 md:w-4" />
                ) : (
                  <Send className="h-5 w-5 md:h-4 md:w-4" />
                )}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-gray-600">
              Use the microphone icon to practice speaking naturally.
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

// 6. UPGRADED MESSAGE BUBBLE WITH TEXT-TO-SPEECH
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
  const [isPlaying, setIsPlaying] = useState(false);

  // Text-to-Speech logic for AI responses
  const handleReadAloud = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Strip out markdown symbols (*, #, `) so it reads cleanly like a human
    const cleanText = content.replace(/[*_#`~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Optional: Make it sound more conversational (adjust depending on browser voices available)
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  // Cleanup speech if component unmounts while reading
  useEffect(() => {
    return () => {
      if (isPlaying) window.speechSynthesis.cancel();
    };
  }, [isPlaying]);

  return (
    <div
      className={`flex min-w-0 gap-2.5 sm:gap-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {" "}
      {!isUser && (
        <div className="mt-0.5 flex w-8 shrink-0 flex-col items-center gap-1.5 sm:w-9 sm:gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-500 text-[11px] font-bold text-white shadow-sm sm:h-9 sm:w-9 sm:text-xs">
            AI
          </div>

          {!loading && (
            <button
              onClick={handleReadAloud}
              className={`rounded-full p-1.5 transition-colors md:p-1 ${
                isPlaying
                  ? "bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/40 dark:text-fuchsia-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              title={isPlaying ? "Stop reading" : "Read aloud"}
            >
              {isPlaying ? (
                <Square className="h-3.5 w-3.5 fill-current md:h-3 md:w-3" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 md:h-3 md:w-3" />
              )}
            </button>
          )}
        </div>
      )}
      <div
        className={
          isUser
            ? "w-fit max-w-[92%] rounded-3xl rounded-tr-md bg-gradient-to-r from-fuchsia-600/90 to-pink-500/90 px-4 py-3 text-white shadow-md sm:max-w-[75%]"
            : "min-w-0 flex-1 max-w-none"
        }
      >
        {loading ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:0.2s]" />
          </div>
        ) : (
          <div
            className={
              isUser
                ? "text-sm leading-relaxed"
                : "prose prose-sm md:prose-base dark:prose-invert max-w-none break-words px-1 leading-[1.65] sm:px-0 sm:leading-7 [&>h3]:mt-4 [&>h3]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>p]:mb-3 sm:[&>p]:mb-4 [&>ul]:mb-3 sm:[&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 sm:[&>ul]:pl-6"
            }
          >
            {isUser ? (
              content
            ) : (
              <ReactMarkdown
                components={{
                  code(props) {
                    const { children, className, node, ref, ...rest } = props;
                    const match = /language-(\w+)/.exec(className || "");

                    return match ? (
                      <SyntaxHighlighter
                        {...rest}
                        PreTag="div"
                        children={String(children).replace(/\n$/, "")}
                        language={match[1]}
                        style={vscDarkPlus as any}
                        className="my-3 max-w-full overflow-x-auto !bg-[#1E1E1E] !shadow-md rounded-lg text-[12px] sm:my-4 sm:text-sm"
                      />
                    ) : (
                      <code
                        ref={ref}
                        {...rest}
                        className="rounded-md bg-fuchsia-100 px-1.5 py-0.5 font-mono text-sm text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300"
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
