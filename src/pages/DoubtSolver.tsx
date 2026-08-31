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
  Camera,
  Image as ImageIcon,
  X,
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
  imageData?: string[];
  imageName?: string[];
};

// ─── Suggestion chips ─────────────────────────────────────────────────────────
// Keep only the three questions selected for the mobile UI.
const SUGGESTIONS = [
  "Explain recursion with a real example",
  "What is Big O notation?",
  "What are pointers in C++?",
];

// ─── Component ────────────────────────────────────────────────────────────────

function DoubtSolver() {
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId: string }>();

  const [user, setUser] = useState({ name: "You", email: "", avatarUrl: "" });
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // Keep multiple images in the composer so Camera, Photos and pasted images
  // can all be added before the user sends the question.
  const [imageAttachments, setImageAttachments] = useState<
    Array<{ dataUrl: string; name: string }>
  >([]);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStreamVersion, setCameraStreamVersion] = useState(0);

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);

  const photoInputRef = useRef<HTMLInputElement>(null);

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

  async function prepareImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // Keep the request comfortably below the backend JSON limit.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        image.onload = () => {
          const maxSide = 1280;
          const scale = Math.min(
            1,
            maxSide / Math.max(image.width, image.height),
          );

          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Unable to prepare image"));
            return;
          }

          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.72));
        };

        image.onerror = () => reject(new Error("Unable to read image"));
        image.src = String(reader.result);
      };

      reader.onerror = () => reject(new Error("Unable to read image"));
      reader.readAsDataURL(file);
    });

    if (dataUrl.length > 1_500_000) {
      toast.error("Image is too large. Please choose a smaller photo.");
      return;
    }

    return {
      dataUrl,
      name: file.name || "Pasted image",
    };
  }

  async function handleImageSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    try {
      const preparedImages: Array<{ dataUrl: string; name: string }> = [];

      for (const file of files) {
        const prepared = await prepareImage(file);
        if (prepared) preparedImages.push(prepared);
      }

      if (preparedImages.length > 0) {
        setImageAttachments((current) => [...current, ...preparedImages]);
        setAttachmentMenuOpen(false);
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not prepare one or more images.");
    }
  }

  async function openCamera() {
    setAttachmentMenuOpen(false);
    setCameraError("");
    setCameraReady(false);

    // Open the modal FIRST so the <video> element is mounted.
    setCameraOpen(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not supported by this browser.");
      return;
    }

    // Give this camera request a unique ID.
    // This prevents a delayed permission response from reopening
    // a camera that the user already closed.
    const requestId = ++cameraRequestRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // User may have closed the camera while permission was pending.
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      cameraStreamRef.current = stream;

      // Tell React that a new stream is available.
      // This causes the attachment effect below to run.
      setCameraStreamVersion((version) => version + 1);
    } catch (error) {
      console.error("Camera error:", error);

      if (requestId !== cameraRequestRef.current) {
        return;
      }

      setCameraError(
        "Camera access was blocked. Please allow camera permission and try again.",
      );
    }
  }

  /*
   * Attach the MediaStream AFTER the <video> element exists.
   *
   * This replaces the old setTimeout() approach.
   * It is the important fix for the camera getting stuck on
   * "Starting camera...".
   */
  useEffect(() => {
    if (!cameraOpen || cameraError) {
      return;
    }

    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;

    if (!video || !stream) {
      return;
    }

    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    let cancelled = false;

    video
      .play()
      .then(() => {
        if (!cancelled) {
          setCameraReady(true);
        }
      })
      .catch((error) => {
        console.error("Camera playback error:", error);

        if (!cancelled) {
          setCameraError("Could not start the camera preview.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cameraOpen, cameraError, cameraStreamVersion]);

  function closeCamera() {
    // Invalidate any camera request that may still be waiting.
    cameraRequestRef.current += 1;

    // Stop every camera track.
    cameraStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    cameraStreamRef.current = null;

    // Detach the stream from the video element.
    if (cameraVideoRef.current) {
      cameraVideoRef.current.pause();
      cameraVideoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
    setCameraError("");
  }

  async function captureCameraPhoto() {
    const video = cameraVideoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera is not ready yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    const maxSide = 1280;

    const scale = Math.min(
      1,
      maxSide / Math.max(video.videoWidth, video.videoHeight),
    );

    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));

    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      toast.error("Could not capture the camera image.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

    if (dataUrl.length > 1_500_000) {
      toast.error("Captured image is too large. Please try again.");
      return;
    }

    setImageAttachments((current) => [
      ...current,
      {
        dataUrl,
        name: `camera-${new Date().getTime()}.jpg`,
      },
    ]);

    closeCamera();
    inputRef.current?.focus();
  }

  // Paste an image directly into the composer with Ctrl/Cmd + V.
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));

      if (!imageItem) return;

      const file = imageItem.getAsFile();
      if (!file) return;

      event.preventDefault();

      prepareImage(
        new File([file], `pasted-image-${Date.now()}.png`, {
          type: file.type || "image/png",
        }),
      )
        .then((prepared) => {
          if (!prepared) return;
          setImageAttachments((current) => [...current, prepared]);
          setAttachmentMenuOpen(false);
          inputRef.current?.focus();
        })
        .catch((error) => {
          console.error(error);
          toast.error("Could not paste that image.");
        });
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Always stop the camera if the component is unmounted.
  useEffect(() => {
    return () => {
      cameraRequestRef.current += 1;

      cameraStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      cameraStreamRef.current = null;
    };
  }, []);

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

  function handleInputFocus() {
    // Helps mobile browsers keep the composer visible above the keyboard.
    window.setTimeout(() => {
      inputRef.current?.scrollIntoView({ block: "nearest" });
    }, 80);
  }

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

    if ((!text && imageAttachments.length === 0) || sending) return;

    const selectedImages = imageAttachments;

    setInput("");
    setImageAttachments([]);
    setAttachmentMenuOpen(false);
    setSending(true);
    setStreamingText("");

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        text || "Please analyze these images and help me solve the question.",
      imageData: selectedImages.map((image) => image.dataUrl),
      imageName: selectedImages.map((image) => image.name),
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

      const apiMessages = [...messages, userMessage].map((m) => {
        if (m.role === "user" && m.imageData && m.imageData.length > 0) {
          return {
            role: m.role,
            content: [
              {
                type: "text" as const,
                text:
                  m.content ||
                  "Please analyze these images and help me solve the question.",
              },
              ...m.imageData.map((image) => ({
                type: "image" as const,
                image,
              })),
            ],
          };
        }

        return {
          role: m.role,
          content: m.content,
        };
      });

      const response = await fetch(
        "https://speakwiseai-z1g2.onrender.com/api/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            threadId: currentThreadId,
            messages: apiMessages,
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
        {/* New Chat */}
        <div className="sticky top-0 z-20 bg-white/95 px-4 py-2 backdrop-blur dark:bg-gray-950/95">
          <button
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Chat History */}
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
                  className={`group flex min-w-0 items-center rounded-lg transition-colors ${
                    active
                      ? "bg-violet-50 dark:bg-violet-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  {/* Chat title */}
                  <button
                    type="button"
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

                  {/* Delete chat */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteClick(thread.id, thread.title);
                    }}
                    aria-label={`Delete ${thread.title}`}
                    title="Delete chat"
                    className="
    mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center
    rounded-md text-gray-400
    opacity-100
    transition-colors
    hover:bg-red-50 hover:text-red-500
    focus:outline-none focus:ring-2 focus:ring-red-500/30
    dark:text-gray-500
    dark:hover:bg-red-900/20
    dark:hover:text-red-400
  "
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
          <div className="flex min-h-14 items-center justify-center gap-2 border-b border-gray-100 bg-white/90 px-16 py-3 text-center backdrop-blur dark:border-gray-800 dark:bg-gray-950/90 md:justify-start md:px-6 md:text-left">
            <Brain className="h-4 w-4 shrink-0 text-violet-500" />
            <span className="min-w-0 max-w-full truncate text-sm font-medium text-gray-700 dark:text-gray-300">
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
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    imageData={m.imageData}
                  />
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
        <div className="bg-white/80 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-sm sm:px-4 sm:pb-5 sm:pt-3 dark:bg-gray-950/80">
          <div className="mx-auto max-w-3xl">
            {/* Attachment menu — available on every device size. */}
            {attachmentMenuOpen && (
              <div
                className="mb-2 ml-0 flex w-[min(18rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-gray-800 dark:bg-gray-900"
                role="menu"
              >
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={sending}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-violet-50 hover:text-violet-700 active:scale-[0.99] disabled:opacity-40 dark:text-gray-200 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                    <Camera className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block">Camera</span>
                    <span className="block text-xs font-normal text-gray-400">
                      Take a live photo
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAttachmentMenuOpen(false);
                    photoInputRef.current?.click();
                  }}
                  disabled={sending}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-violet-50 hover:text-violet-700 active:scale-[0.99] disabled:opacity-40 dark:text-gray-200 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-300">
                    <ImageIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block">Add Photos &amp; Files</span>
                    <span className="block text-xs font-normal text-gray-400">
                      Choose one or more images from your device
                    </span>
                  </span>
                </button>

                <p className="px-3.5 pb-2 pt-1 text-[10px] leading-4 text-gray-400 dark:text-gray-600">
                  You can also paste a copied image directly into this box.
                </p>
              </div>
            )}

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelected}
              className="hidden"
            />

            {/* Selected image previews */}
            {imageAttachments.length > 0 && (
              <div className="mb-2 rounded-2xl border border-violet-200 bg-violet-50/70 p-2 dark:border-violet-800 dark:bg-violet-950/20">
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {imageAttachments.map((image, index) => (
                    <div
                      key={`${image.name}-${index}`}
                      className="relative shrink-0"
                    >
                      <img
                        src={image.dataUrl}
                        alt={`Selected question image ${index + 1}`}
                        className="h-16 w-16 rounded-xl border border-white object-cover shadow-sm dark:border-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setImageAttachments((current) =>
                            current.filter(
                              (_, imageIndex) => imageIndex !== index,
                            ),
                          )
                        }
                        aria-label={`Remove image ${index + 1}`}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition hover:bg-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 px-1 text-[10px] text-violet-600 dark:text-violet-400">
                  {imageAttachments.length} image
                  {imageAttachments.length === 1 ? "" : "s"} attached
                </p>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-[1.6rem] border border-gray-200/80 bg-white px-2.5 py-2.5 shadow-[0_4px_24px_rgba(15,23,42,0.07)] transition-all duration-200 focus-within:border-violet-300 focus-within:shadow-[0_6px_28px_rgba(124,58,237,0.12)] sm:gap-2.5 sm:rounded-4xl sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-violet-700">
              <button
                type="button"
                onClick={() => setAttachmentMenuOpen((open) => !open)}
                disabled={sending}
                aria-label="Add photos and files"
                aria-expanded={attachmentMenuOpen}
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl text-gray-500 transition hover:bg-violet-50 hover:text-violet-600 active:scale-95 disabled:opacity-40 sm:h-9 sm:w-9 dark:text-gray-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-300"
              >
                <Plus
                  className={`h-5 w-5 transition-transform duration-200 ${
                    attachmentMenuOpen ? "rotate-45" : ""
                  }`}
                />
              </button>

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
                  imageAttachments.length > 0
                    ? "Add a question about these images…"
                    : "Ask anything…"
                }
                disabled={sending}
                style={{ fontFamily: "var(--font-chat)" }}
                className="min-h-[40px] max-h-40 min-w-0 flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent px-1 py-2 text-base leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 [-webkit-overflow-scrolling:touch] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[36px] sm:px-0 sm:py-1 sm:text-sm dark:text-gray-100 dark:placeholder:text-gray-600"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  sending || (!input.trim() && imageAttachments.length === 0)
                }
                aria-label={sending ? "Sending question" : "Send question"}
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-sm transition-all hover:-translate-y-0.5 hover:opacity-90 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-1.5 hidden text-center text-[11px] text-gray-400 dark:text-gray-600 sm:mt-2 sm:block">
              SpeakWise AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
      {/* Live camera modal */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Take a photo"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-gray-950 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Take a photo</p>
                <p className="text-xs text-gray-400">
                  Position your question clearly
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                aria-label="Close camera"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-950">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
                  <Camera className="mb-3 h-10 w-10 text-gray-500" />
                  <p className="text-sm text-gray-200">{cameraError}</p>
                  <button
                    type="button"
                    onClick={closeCamera}
                    className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={cameraVideoRef}
                    muted
                    playsInline
                    autoPlay
                    className="h-full w-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300">
                      Starting camera…
                    </div>
                  )}
                </>
              )}
            </div>

            {!cameraError && (
              <div className="flex items-center justify-center bg-gray-950 px-4 py-5">
                <button
                  type="button"
                  onClick={captureCameraPhoto}
                  disabled={!cameraReady}
                  aria-label="Capture photo"
                  className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white shadow-lg transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="h-12 w-12 rounded-full border-2 border-gray-300" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
  imageData,
  loading = false,
}: {
  role: Message["role"];
  content: string;
  imageData?: string[];
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
          <div className="space-y-2">
            {imageData && imageData.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageData.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`Attached question image ${index + 1}`}
                    className="max-h-64 max-w-full rounded-2xl object-contain shadow-sm"
                  />
                ))}
              </div>
            )}
            <p
              className="whitespace-pre-wrap text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-chat)" }}
            >
              {content}
            </p>
          </div>
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
