import { useEffect, useState } from "react";
import {
  Code2,
  Database,
  BrainCircuit,
  LayoutTemplate,
  Layers,
} from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";

import { SiteFooter } from "../components/site-footer";

export default function ProjectDetails() {
  const [user, setUser] = useState({
    name: "Loading...",
    email: "",
    avatarUrl: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const u = session.user;
      setUser({
        name:
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          u.email?.split("@")[0] ??
          "User",
        email: u.email ?? "",
        avatarUrl: u.user_metadata?.avatar_url ?? "",
      });
    });
  }, []);

  const technologies = [
    {
      name: "Frontend UI",
      icon: LayoutTemplate,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      desc: "Built with React and React Router for seamless single-page navigation. Styled using the latest Tailwind CSS v4 and Lucide React icons for a crisp, responsive, glassmorphic design that supports both Light and Dark modes.",
    },
    {
      name: "Backend & Auth",
      icon: Database,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      desc: "Powered by Supabase. Utilizes PostgreSQL for robust data storage (threads, messages, profiles, and scores), Row Level Security (RLS) for privacy, and Supabase Storage for fast profile avatar uploads.",
    },
    {
      name: "AI Engine",
      icon: BrainCircuit,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      desc: "Integrated with Gemini AI (via a custom Node.js backend) to provide real-time, streaming responses. Features intelligent prompt engineering to act as a doubt solver, a strict interviewer, or a communication coach.",
    },
    {
      name: "Web APIs",
      icon: Code2,
      color: "text-pink-500",
      bg: "bg-pink-50 dark:bg-pink-900/20",
      desc: "Leverages modern browser APIs including the Web Speech API for real-time voice-to-text recognition and text-to-speech synthesis, allowing for natural, conversational practice sessions.",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <AppSidebar user={user} />

      <main className="relative flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-12 border-b border-gray-200 pb-8 dark:border-gray-800">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Layers className="h-4 w-4" /> System Architecture
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Project Details
            </h1>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl">
              A deep dive into the technologies, frameworks, and APIs powering
              the SpeakWise AI platform.
            </p>
          </div>

          {/* Tech Stack Grid */}
          <div className="mb-16">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
              Technology Stack
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {technologies.map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${tech.bg} ${tech.color}`}
                    >
                      <tech.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tech.name}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {tech.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Core Modules List */}
          <div>
            <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
              Core Modules
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h4 className="font-semibold text-violet-600 dark:text-violet-400">
                  1. Doubt Solver Workspace
                </h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  A dynamic chat interface featuring Markdown parsing and syntax
                  highlighting for technical questions, math problems, and
                  algorithmic discussions.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h4 className="font-semibold text-indigo-600 dark:text-indigo-400">
                  2. Mock Interview Engine
                </h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  A structured simulation environment where the AI adopts
                  specific technical or HR personas, asks consecutive questions,
                  and provides an aggregated score upon completion.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h4 className="font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                  3. Communication & Fluency
                </h4>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  An audio-first workspace utilizing Speech-to-Text and
                  Text-to-Speech to help users practice conversational English,
                  vocabulary, and daily small talk.
                </p>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
