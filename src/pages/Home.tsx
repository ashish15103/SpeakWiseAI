import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import {
  Brain,
  MessageSquare,
  Mic,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Target,
  BarChart3,
  Check,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-soft">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-brand opacity-30 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-brand-glow opacity-20 blur-3xl animate-float" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Powered by Ashish Gunjan 😶‍🌫️
          </div>

          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Learn smarter.
            <br />
            <span className="text-gradient-brand">Speak with confidence.</span>
          </h1>

          <p className="mt-6 text-pretty text-lg text-muted-foreground sm:text-xl">
            Your personal AI tutor for solving doubts, cracking interviews, and
            mastering communication — built for ambitious students.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/doubt-solver"
              className="inline-flex h-11 items-center justify-center rounded-md bg-gradient-brand px-8 text-sm font-medium text-brand-foreground shadow-elegant transition-all hover:opacity-90"
            >
              Start learning free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>

            <Link
              to="/mock-interview"
              className="inline-flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium transition-colors hover:bg-muted"
            >
              Try mock interview
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand" />
              No credit card
            </span>

            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand" />
              Instant feedback
            </span>

            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand" />
              Saves your progress
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Brain,
    title: "AI Doubt Solver",
    desc: "Ask anything — programming, aptitude, academics. Get step-by-step explanations with code and examples.",
    to: "/doubt-solver",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Mic,
    title: "Mock Interviews",
    desc: "Practice HR, technical and communication interviews. The AI asks, evaluates and coaches you.",
    to: "/mock-interview",
    color: "from-indigo-500 to-violet-500",
  },
  {
    icon: MessageSquare,
    title: "Communication Practice",
    desc: "Self-intros, career goals, daily speaking prompts — with scores on clarity, confidence and structure.",
    to: "/communication",
    color: "from-fuchsia-500 to-pink-500",
  },
] as const;

function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to grow
        </h2>

        <p className="mt-4 text-muted-foreground">
          Three powerful AI workspaces in one platform.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.title}
            to={f.to}
            className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-elegant"
          >
            <div
              className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-white shadow-lg`}
            >
              <f.icon className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-semibold">{f.title}</h3>

            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>

            <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand">
              Try it
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    icon: GraduationCap,
    title: "Pick a workspace",
    desc: "Choose Doubt Solver, Mock Interview, or Communication.",
  },
  {
    icon: Target,
    title: "Practice with AI",
    desc: "Get personalized questions, explanations and feedback in real time.",
  },
  {
    icon: BarChart3,
    title: "Track your progress",
    desc: "Every conversation is saved so you can revisit and improve.",
  },
] as const;

function HowItWorks() {
  return (
    <section className="border-y bg-gradient-soft">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>

          <p className="mt-4 text-muted-foreground">
            From doubt to confident answer in three steps.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-2xl bg-card p-8 shadow-card"
            >
              <div className="absolute -top-4 left-8 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                {i + 1}
              </div>

              <s.icon className="h-8 w-8 text-brand" />

              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>

              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-violet-600 to-purple-600 px-6 py-20 text-center shadow-2xl sm:rounded-3xl sm:px-16">
          {/* Decorative background shapes */}
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white opacity-10 blur-2xl" />

          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to master your communication?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-violet-100">
            Join ambitious students who are solving doubts, cracking interviews,
            and speaking with confidence.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/dashboard"
              className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-violet-600 shadow-md transition-all hover:scale-105 hover:bg-violet-50 hover:shadow-lg"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
