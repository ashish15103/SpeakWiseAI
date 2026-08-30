import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Trophy,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";
import { createThread } from "../lib/threads";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  var SpeechRecognition: any;
  var webkitSpeechRecognition: any;
}
type InterviewMode = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

type InterviewStatus =
  | "ready"
  | "speaking"
  | "listening"
  | "processing"
  | "completed";

const MODES: InterviewMode[] = [
  {
    id: "hr",
    label: "HR Interview",
    description: "Practice real-world HR and behavioral questions.",
    icon: "👤",
  },
  {
    id: "technical",
    label: "Technical Interview",
    description: "Test your technical knowledge and explanation skills.",
    icon: "💻",
  },
  {
    id: "communication",
    label: "Communication Test",
    description: "Improve fluency, grammar, clarity and confidence.",
    icon: "🎙️",
  },
];

const QUESTION_LIMIT = 5;

export default function MockInterview() {
  const navigate = useNavigate();
  const { threadId } = useParams();

  // User & Setup State
  const [user, setUser] = useState({ name: "You", email: "", avatarUrl: "" });
  const [targetRole, setTargetRole] = useState("");
  const [mode, setMode] = useState<InterviewMode | null>(null);

  // Interview State
  const [status, setStatus] = useState<InterviewStatus>("ready");
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [pending, setPending] = useState(false);

  const modeRef = useRef<InterviewMode | null>(null);
  const submitAnswerRef = useRef<(answer: string) => Promise<void>>(
    async () => {},
  );
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const shouldSubmitRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const questionNumberRef = useRef(0);
  const interviewActiveRef = useRef(true);
  const requestIdRef = useRef(0);
  const keepListeningRef = useRef(false);

  const conversationHistoryRef = useRef<{ role: string; content: string }[]>(
    [],
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
  // 👇 NEW: Clear state whenever navigating between different interview threads
  useEffect(() => {
    if (threadId) {
      setStatus("ready");
      setQuestion("");
      setTranscript("");
      setFeedback("");
      setQuestionNumber(0);
      setInterviewStarted(false);
      setError("");
      window.speechSynthesis.cancel();
      conversationHistoryRef.current = [];
      questionNumberRef.current = 0;
      requestIdRef.current += 1;
    }
  }, [threadId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    interviewActiveRef.current = true;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionActiveRef.current = true;
      setStatus("listening");
      setError("");
    };

    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += text;
        } else {
          interimChunk += text;
        }
      }

      if (finalChunk.trim()) {
        finalTranscriptRef.current =
          `${finalTranscriptRef.current} ${finalChunk}`.trim();
      }

      setTranscript(`${finalTranscriptRef.current} ${interimChunk}`.trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone permission was denied. Please allow access.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("I couldn't hear you clearly. Please try speaking again.");
      }
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;

      if (shouldSubmitRef.current) {
        shouldSubmitRef.current = false;
        keepListeningRef.current = false;

        const answer = finalTranscriptRef.current.trim();
        if (!answer) {
          setStatus("ready");
          setError("I couldn't detect an answer. Please try again.");
          return;
        }

        setStatus("processing");
        void submitAnswerRef.current(answer);
        return;
      }

      if (keepListeningRef.current && interviewActiveRef.current) {
        setTimeout(() => {
          if (
            keepListeningRef.current &&
            interviewActiveRef.current &&
            !recognitionActiveRef.current
          ) {
            try {
              recognition.start();
            } catch {}
          }
        }, 250);
        return;
      }

      if (interviewActiveRef.current) {
        setStatus("ready");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      interviewActiveRef.current = false;
      shouldSubmitRef.current = false;
      keepListeningRef.current = false;
      recognitionActiveRef.current = false;

      try {
        recognition.abort();
      } catch {}
      recognitionRef.current = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  async function handleStartMode(selectedMode: InterviewMode) {
    setPending(true);
    try {
      const newThread = await createThread("interview", selectedMode.id);
      setMode(selectedMode);
      navigate(`/mock-interview/${newThread.id}`);
    } catch (error) {
      console.error(error);
      setError("Failed to create interview session.");
    } finally {
      setPending(false);
    }
  }

  const speak = useCallback(
    (text: string, onFinished?: () => void) => {
      if (typeof window === "undefined" || !interviewActiveRef.current) return;

      window.speechSynthesis.cancel();

      if (isMuted) {
        onFinished?.();
        return;
      }

      const cleanText = text
        .replace(/<<<SCORES[\s\S]*?>>>/gi, "")
        .replace(/\*\*/g, "")
        .trim();
      if (!cleanText) {
        onFinished?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-IN";
      utterance.rate = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find((v) => v.lang.toLowerCase().includes("en-in")) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setStatus("speaking");
      utterance.onend = () => {
        if (interviewActiveRef.current) onFinished?.();
      };
      utterance.onerror = () => {
        if (interviewActiveRef.current) onFinished?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted],
  );

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError(
        "Voice recognition is unavailable. Please allow microphone access.",
      );
      return;
    }
    if (recognitionActiveRef.current) return;

    setError("");
    finalTranscriptRef.current = "";
    shouldSubmitRef.current = false;
    keepListeningRef.current = true;
    setTranscript("");

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setError("The microphone could not be started.");
    }
  }, []);

  async function askAI(message: string) {
    if (!threadId) throw new Error("Interview session not found.");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Session expired.");

    const userMsg = { role: "user", content: message };
    const apiMessages = [...conversationHistoryRef.current, userMsg];

    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ threadId, messages: apiMessages }),
    });

    if (!response.ok) throw new Error("AI request failed.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Stream not available");

    const decoder = new TextDecoder();
    let fullText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }

    const cleaned = fullText.replace(/<<<SCORES[\s\S]*?>>>/gi, "").trim();
    conversationHistoryRef.current = [
      ...apiMessages,
      { role: "assistant", content: cleaned },
    ];
    return cleaned;
  }

  async function startInterview() {
    const currentMode = modeRef.current;
    if (!threadId || !currentMode) return;

    const requestId = ++requestIdRef.current;
    interviewActiveRef.current = true;
    conversationHistoryRef.current = [];

    setInterviewStarted(true);
    setStatus("processing");
    setError("");
    setQuestionNumber(1);
    questionNumberRef.current = 1;

    // Adjust instructions based on whether the user typed a specific role or left it blank
    const roleContext = targetRole.trim()
      ? `The student is applying for the role of ${targetRole}. Base your upcoming questions on this role.`
      : `The student hasn't specified a role, so conduct a generic, confidence-building interview to help them prepare for campus placements.`;

    try {
      const firstQuestion = await askAI(
        `You are a friendly, realistic human interviewer conducting a ${currentMode.label} for a student preparing for campus placements. ${roleContext}\n\nFor your FIRST question, briefly introduce yourself and ask the student to introduce themselves. Do NOT ask any hard technical questions yet. Keep it warm, natural, and welcoming. Ask ONLY this first introductory question. Do not provide evaluation.`,
      );

      if (!interviewActiveRef.current || requestId !== requestIdRef.current)
        return;

      setQuestion(firstQuestion);
      setFeedback("");
      speak(firstQuestion, () => setStatus("ready"));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to start.");
      setStatus("ready");
    }
  }

  function finishAnswer() {
    const recognition = recognitionRef.current;
    if (!recognition || !recognitionActiveRef.current) return;
    keepListeningRef.current = false;
    shouldSubmitRef.current = true;
    try {
      recognition.stop();
    } catch {}
  }

  async function submitAnswer(answer: string) {
    if (!threadId || !modeRef.current || !answer.trim()) {
      setStatus("ready");
      setError("Something went wrong. Please try again.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus("processing");
    setError("");
    setFeedback("");

    const currentQuestion = questionNumberRef.current;
    const isLastQuestion = currentQuestion >= QUESTION_LIMIT;

    try {
      const instruction = isLastQuestion
        ? `Student answer to question ${currentQuestion} of ${QUESTION_LIMIT}:\n"${answer}"\n\nThis is the FINAL question. Evaluate the student's overall performance. Provide Strengths, Areas to improve, and Communication quality. End the interview professionally.`
        : `Student answer to question ${currentQuestion} of ${QUESTION_LIMIT}:\n"${answer}"\n\nAcknowledge the answer naturally. Then, ask ONLY ONE NEXT interview question. Gradually increase the difficulty based on their responses. Do not reveal scores yet.`;

      const response = await askAI(instruction);

      if (requestId !== requestIdRef.current) return;

      if (isLastQuestion) {
        setFeedback(response);
        setStatus("completed");
        speak(response);
      } else {
        const nextNumber = currentQuestion + 1;
        questionNumberRef.current = nextNumber;
        setQuestionNumber(nextNumber);
        setQuestion(response);
        setTranscript("");
        speak(response, () => setStatus("ready"));
      }
    } catch (err) {
      console.error(err);
      setError("Unable to process your answer.");
      setStatus("ready");
    }
  }

  useEffect(() => {
    submitAnswerRef.current = submitAnswer;
  });

  function restart() {
    requestIdRef.current += 1;
    interviewActiveRef.current = true;
    shouldSubmitRef.current = false;
    recognitionActiveRef.current = false;
    finalTranscriptRef.current = "";
    conversationHistoryRef.current = [];
    window.speechSynthesis.cancel();
    if (recognitionRef.current)
      try {
        recognitionRef.current.abort();
      } catch {}

    setStatus("ready");
    setQuestion("");
    setTranscript("");
    setFeedback("");
    setQuestionNumber(0);
    questionNumberRef.current = 0;
    setInterviewStarted(false);
    setError("");
  }

  if (!threadId) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar user={user} />

        <main className="flex-1 overflow-y-auto relative">
          <div className="flex min-h-full items-center justify-center p-8">
            <div className="relative w-full max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-lg">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">
                AI Mock Interview
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Practice realistic interviews using your voice. Speak naturally
                and receive AI-powered feedback.
              </p>

              <div className="mx-auto mt-10 grid gap-4 md:grid-cols-3">
                {MODES.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => handleStartMode(m)}
                    disabled={pending}
                    className="group flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-500 hover:shadow-lg disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 text-sm font-bold text-white shadow-md">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-semibold">{m.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {m.description}
                      </p>
                    </div>
                    <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-violet-600 opacity-0 transition group-hover:opacity-100">
                      Start <ArrowRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const progressPct = Math.min(
    100,
    Math.round((questionNumber / QUESTION_LIMIT) * 100),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AppSidebar user={user} />

      {/* Everything below is a single fixed-height column: header (auto),
          content (flex-1, min-h-0 so it never pushes the page taller than
          the viewport), controls (auto). Nothing here causes page scroll —
          only the question/transcript text areas scroll internally if
          they're unusually long. */}
      <main className="flex h-screen flex-1 flex-col overflow-hidden relative">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="shrink-0 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
          <div className="flex items-center justify-between px-5 py-3">
            <button
              onClick={() => {
                interviewActiveRef.current = false;
                window.speechSynthesis.cancel();
                navigate("/mock-interview");
              }}
              className="flex items-center text-sm font-medium text-gray-600 transition-colors hover:text-violet-600 dark:text-gray-300 dark:hover:text-violet-400"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Exit
            </button>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {mode?.label ?? "Mock Interview"}
              </p>
              {interviewStarted && status !== "completed" && (
                <p className="text-xs text-gray-400">
                  Question {questionNumber} of {QUESTION_LIMIT}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setIsMuted((v) => !v);
                window.speechSynthesis.cancel();
              }}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              title={isMuted ? "Unmute AI voice" : "Mute AI voice"}
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {interviewStarted && status !== "completed" && (
            <div className="h-1 w-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </header>

        {/* ── Body: fills remaining height exactly, never overflows page ─── */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-56 w-full max-w-3xl -translate-x-1/2 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/10" />

          {!interviewStarted ? (
            /* ── Setup screen ───────────────────────────────────────────── */
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-5">
              <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-violet-500/5 dark:border-gray-800 dark:bg-gray-900">
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-purple-500 px-8 py-8 text-center text-white">
                  <div className="pointer-events-none absolute inset-0 bg-white/5" />
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl backdrop-blur">
                    🤖
                  </div>
                  <h2 className="relative text-2xl font-bold">
                    Ready for your interview?
                  </h2>
                  <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-white/85">
                    Answer naturally using your microphone — one question at a
                    time.
                  </p>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/40">
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        01
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">
                        Listen
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/40">
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        02
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">
                        Speak
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-800 dark:bg-gray-800/40">
                      <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                        03
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">
                        Be yourself
                      </p>
                    </div>
                  </div>

                  {!isSupported && (
                    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                      Voice recognition isn't available in this browser. Please
                      use Google Chrome or Edge.
                    </div>
                  )}

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Target Role (Optional)
                    </label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Frontend Developer, Data Scientist..."
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                    />
                  </div>

                  <button
                    disabled={!isSupported || !mode}
                    onClick={startInterview}
                    className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-sm font-medium text-white shadow-lg shadow-violet-500/30 transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Mic className="mr-2 h-5 w-5" /> Start Interview
                  </button>
                </div>
              </div>
            </div>
          ) : status === "completed" ? (
            /* ── Completed screen ───────────────────────────────────────── */
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-5">
              <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg shadow-violet-500/5 dark:border-gray-800 dark:bg-gray-900">
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-purple-500 px-8 py-8 text-center text-white">
                  <div className="pointer-events-none absolute inset-0 bg-white/5" />
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <h2 className="relative mt-4 text-2xl font-bold">
                    Interview Complete
                  </h2>
                  <p className="relative mt-1 text-sm text-white/85">
                    Here's your AI interview feedback.
                  </p>
                </div>

                <div className="max-h-[50vh] overflow-y-auto px-6 py-6 sm:px-8">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/40">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        AI Performance Feedback
                      </h3>
                    </div>
                    <div
                      className="
                        prose prose-sm dark:prose-invert max-w-none break-words
                        leading-[1.7] text-gray-800 dark:text-gray-200
                        prose-p:my-3 first:[&>*]:mt-0 last:[&>*]:mb-0
                        prose-headings:font-semibold prose-headings:text-gray-900
                        dark:prose-headings:text-white
                        prose-ul:my-3 prose-ul:pl-5 prose-li:my-1.5
                        prose-strong:font-semibold prose-strong:text-gray-900
                        dark:prose-strong:text-white
                      "
                    >
                      <ReactMarkdown>{feedback}</ReactMarkdown>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 px-6 py-5 dark:border-gray-800">
                  <button
                    onClick={restart}
                    className="mx-auto flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-500 px-8 text-sm font-medium text-white shadow-md shadow-violet-500/30 transition hover:opacity-90"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Active interview "cockpit" — fixed to viewport, no page scroll ── */
            <div className="flex min-h-0 flex-1 flex-col items-center px-4 py-4 sm:px-6">
              <div className="flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3">
                {/* Compact status strip */}
                <div className="flex shrink-0 items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-800 dark:bg-gray-900">
                  <div
                    className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-500 text-base shadow-sm ${
                      status === "speaking" ? "animate-pulse" : ""
                    }`}
                  >
                    🤖
                    {status === "speaking" && (
                      <span className="absolute inset-0 rounded-full border-2 border-violet-400/50 animate-ping" />
                    )}
                    {status === "listening" && (
                      <span className="absolute -inset-1 rounded-full border-2 border-red-400/60 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    {status === "speaking" && (
                      <>
                        <Volume2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        AI is speaking
                      </>
                    )}
                    {status === "listening" && (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                        Listening to you
                      </>
                    )}
                    {status === "processing" && (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600 dark:text-violet-400" />
                        Evaluating your answer
                      </>
                    )}
                    {status === "ready" && "Your turn to answer"}
                  </div>

                  {/* Progress dots inline, saves vertical space */}
                  <div className="ml-2 flex items-center gap-1">
                    {Array.from({ length: QUESTION_LIMIT }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i < questionNumber
                            ? "w-4 bg-gradient-to-r from-violet-600 to-purple-500"
                            : "w-1.5 bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Question — flexible, scrolls internally if very long */}
                <div className="flex min-h-0 flex-[1.1] flex-col rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-5 dark:border-violet-900/40 dark:from-violet-950/20 dark:to-purple-950/20">
                  <p className="mb-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    Question {questionNumber}
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <p className="text-lg font-semibold leading-7 text-gray-900 dark:text-white sm:text-xl sm:leading-8">
                      {question}
                    </p>
                  </div>
                </div>

                {/* Your response — flexible, scrolls internally if very long */}
                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                  <p className="mb-1.5 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Your response
                  </p>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {transcript ? (
                      <p className="leading-7 text-gray-800 dark:text-gray-200">
                        {transcript}
                      </p>
                    ) : (
                      <p className="text-sm italic text-gray-400">
                        Your spoken answer will appear here...
                      </p>
                    )}
                  </div>
                </div>

                {/* Error strip — compact, only shown when present */}
                {error && (
                  <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Controls — pinned at bottom of the cockpit, always visible */}
                <div className="flex shrink-0 flex-col items-center gap-1.5 pt-1">
                  {status === "listening" ? (
                    <button
                      onClick={finishAnswer}
                      className="inline-flex h-14 min-w-52 items-center justify-center rounded-full bg-red-500 px-8 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition hover:bg-red-600"
                    >
                      <MicOff className="mr-2 h-5 w-5" /> Finish Answer
                    </button>
                  ) : (
                    <button
                      onClick={startListening}
                      disabled={
                        status === "speaking" || status === "processing"
                      }
                      className="inline-flex h-14 min-w-52 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-500 px-8 text-sm font-medium text-white shadow-lg shadow-violet-500/30 transition hover:opacity-90 disabled:opacity-50"
                    >
                      {status === "processing" ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                          Evaluating...
                        </>
                      ) : status === "speaking" ? (
                        <>
                          <Volume2 className="mr-2 h-5 w-5" /> AI is speaking
                        </>
                      ) : (
                        <>
                          <Mic className="mr-2 h-5 w-5" /> Start Speaking
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-gray-400">
                    {status === "listening"
                      ? "Click when you have finished your answer."
                      : "Speak clearly, as you would in a real interview."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
