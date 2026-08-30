import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { toast } from "sonner";

import {
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Mail,
  Lock,
  UserRound,
  ArrowRight,
} from "lucide-react";

export default function AuthPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    // 1. Check if they are already logged in when they hit the page
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    // 2. Listen for the exact moment they log in successfully
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Welcome back!");
    navigate("/dashboard"); // Redirect to Dashboard!
  }

  // ... KEEP YOUR signUp, googleSignIn, switchMode, AND return STATEMENT BELOW THIS EXACTLY AS THEY ARE!

  async function signUp(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: {
          display_name: name || email.split("@")[0],
        },
      },
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created. You can sign in now.");

    setMode("signin");
    setPassword("");
  }

  async function googleSignIn() {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`, // (or whatever your original redirect was!)
        queryParams: {
          prompt: "select_account", // 👈 This forces the account picker
        },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  }

  // Reset Password or Forgot Password
  async function handleResetPassword(e: React.MouseEvent) {
    e.preventDefault(); // Prevents the page from refreshing

    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`, // Supabase will redirect here after they click the email link
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent! Check your email.");
    }
  }

  function switchMode(newMode: "signin" | "signup") {
    setMode(newMode);
    setPassword("");
  }

  return (
    <div className="min-h-screen bg-[#09052b]">
      <div className="flex min-h-screen">
        {/* ================= LEFT HERO SECTION ================= */}

        <div className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#160b55] via-[#251070] to-[#08052b] lg:flex lg:w-1/2 xl:w-[55%]">
          {/* Decorative glow */}

          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-3xl" />

          <div className="absolute -bottom-40 right-0 h-[550px] w-[550px] rounded-full bg-violet-500/20 blur-3xl" />

          {/* Decorative waves */}

          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
            <svg
              className="absolute left-[30%] top-[25%] h-[500px] w-[700px]"
              viewBox="0 0 700 500"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-50 280C80 180 150 380 280 280C410 180 480 380 750 220"
                stroke="url(#waveGradient)"
                strokeWidth="2"
              />

              <path
                d="M-50 300C80 200 150 400 280 300C410 200 480 400 750 240"
                stroke="url(#waveGradient)"
                strokeWidth="1.5"
              />

              <path
                d="M-50 320C80 220 150 420 280 320C410 220 480 420 750 260"
                stroke="url(#waveGradient)"
                strokeWidth="1"
              />

              <path
                d="M-50 340C80 240 150 440 280 340C410 220 480 420 750 280"
                stroke="url(#waveGradient)"
                strokeWidth="0.8"
              />

              <defs>
                <linearGradient id="waveGradient" x1="0" y1="0" x2="700" y2="0">
                  <stop stopColor="#8b5cf6" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#c084fc" />
                  <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Hero content */}

          <div className="relative z-10 flex w-full flex-col justify-center px-12 py-16 xl:px-20">
            {/* Logo */}

            <Link to="/" className="mb-14 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
                <Sparkles className="h-5 w-5" />
              </span>

              <span className="text-xl font-semibold tracking-tight text-white">
                SpeakWise <span className="text-violet-300">AI</span>
              </span>
            </Link>

            {/* Main heading */}

            <div className="max-w-xl">
              <p className="mb-5 text-sm font-medium uppercase tracking-[0.25em] text-violet-300">
                Your AI communication companion
              </p>

              <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-white xl:text-6xl">
                Speak with
                <br />
                <span className="bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-transparent">
                  confidence.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-white/70 xl:text-lg">
                AI-powered tools to help you communicate more clearly, speak
                with confidence, and master any conversation.
              </p>
            </div>

            {/* Features */}

            <div className="mt-12 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-violet-200 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-white">AI-Powered Feedback</p>

                  <p className="mt-1 text-sm text-white/50">
                    Get intelligent feedback while you practice.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-violet-200 backdrop-blur-sm">
                  <MessageCircle className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-white">
                    Practice Any Scenario
                  </p>

                  <p className="mt-1 text-sm text-white/50">
                    Prepare for conversations that matter.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-violet-200 backdrop-blur-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <p className="font-medium text-white">Private &amp; Secure</p>

                  <p className="mt-1 text-sm text-white/50">
                    Your account and conversations stay protected.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT AUTH SECTION ================= */}

        <div className="flex min-h-screen w-full items-center justify-center bg-[#f8f7ff] px-5 py-10 sm:px-8 lg:w-1/2 xl:w-[45%]">
          <div className="w-full max-w-[500px]">
            {/* Mobile logo */}

            <div className="mb-8 flex justify-center lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </span>

                <span className="text-xl font-semibold text-slate-900">
                  SpeakWise <span className="text-violet-500">AI</span>
                </span>
              </Link>
            </div>

            {/* Auth card */}

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-7 shadow-[0_25px_70px_rgba(57,32,130,0.12)] sm:p-10">
              {/* Header */}

              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {mode === "signin"
                    ? "Sign in to continue to SpeakWise AI"
                    : "Create an account and start improving your communication"}
                </p>
              </div>

              {/* SIGN IN */}

              {mode === "signin" && (
                <form onSubmit={signIn} className="space-y-5">
                  {/* Email */}

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Email
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>
                  </div>

                  {/* Password */}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-slate-800"
                      >
                        Password
                      </label>

                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="cursor-pointer text-sm font-medium text-violet-600 hover:text-violet-500 hover:underline dark:text-violet-400 dark:hover:text-violet-300"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                      <input
                        id="password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>
                  </div>

                  {/* Sign in */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer flex w-full items-center justify-center rounded-xl bg-violet-600 p-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-violet-700 hover:shadow-md disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "Sign in"}

                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                </form>
              )}

              {/* SIGN UP */}

              {mode === "signup" && (
                <form onSubmit={signUp} className="space-y-5">
                  {/* Name */}

                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Name
                    </label>

                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                        className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>
                  </div>

                  {/* Email */}

                  <div>
                    <label
                      htmlFor="signup-email"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Email
                    </label>

                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                      <input
                        id="signup-email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>
                  </div>

                  {/* Password */}

                  <div>
                    <label
                      htmlFor="signup-password"
                      className="mb-2 block text-sm font-semibold text-slate-800"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                      <input
                        id="signup-password"
                        type="password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                      />
                    </div>
                  </div>

                  {/* Create account */}

                  <button
                    type="submit"
                    disabled={loading}
                    className="cursor-pointer group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5146e5] to-[#b45cf4] text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Creating account..." : "Create account"}

                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                </form>
              )}

              {/* Divider */}

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>

                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* GOOGLE LOGIN */}

              <button
                type="button"
                onClick={googleSignIn}
                disabled={loading}
                className="cursor-pointer flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white p-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M21.35 12.23c0-.79-.07-1.55-.2-2.28H12v4.31h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 21.5c2.63 0 4.84-.87 6.46-2.36l-3.14-2.45c-.87.58-1.98.92-3.32.92-2.55 0-4.7-1.72-5.47-4.03H3.28v2.53A9.75 9.75 0 0 0 12 21.5Z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M6.53 13.58A5.86 5.86 0 0 1 6.22 12c0-.55.11-1.08.31-1.58V7.89H3.28A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.11l3.25-2.53Z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 6.39c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.49 14.63 2.5 12 2.5a9.75 9.75 0 0 0-8.72 5.39l3.25 2.53C7.3 8.11 9.45 6.39 12 6.39Z"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Switch mode */}

              <div className="mt-7 text-center text-sm text-slate-500">
                {mode === "signin" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signup")}
                      className="cursor-pointer font-semibold text-violet-500 transition hover:text-violet-700"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("signin")}
                      className="cursor-pointer font-semibold text-violet-500 transition hover:text-violet-700"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}

            <p className="mt-6 text-center text-xs text-slate-400">
              © {new Date().getFullYear()} SpeakWise AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
