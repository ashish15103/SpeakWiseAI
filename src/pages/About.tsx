import { useEffect, useState } from "react";
import { Sparkles, Target, Users, Heart } from "lucide-react";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";

import { SiteFooter } from "../components/site-footer";

export default function About() {
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
      <AppSidebar user={user} />

      <main className="relative flex-1 overflow-y-auto">
        {/* Decorative Background */}
        <div className="pointer-events-none absolute inset-0 h-96 bg-gradient-to-b from-violet-100/50 to-transparent dark:from-violet-900/10" />

        <div className="relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              About SpeakWise AI
            </h1>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Made for students, by students. The ultimate AI-powered learning
              companion.
            </p>
          </div>

          <div className="space-y-12">
            {/* Mission Section */}
            <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Our Mission
                </h2>
              </div>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                SpeakWise AI was built to solve a critical problem: the gap
                between academic knowledge and industry expectations. While
                university teaches the fundamentals of programming and logic,
                cracking the interview requires a completely different set of
                skills—confidence, clear communication, and the ability to
                articulate complex thoughts under pressure. Our mission is to
                democratize interview preparation and give every student a
                personal, tireless AI mentor.
              </p>
            </section>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Audience Section */}
              <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Who is it for?
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  Whether you are preparing for campus placements, navigating
                  your first technical HR round, or just looking to improve your
                  spoken English and fluency, SpeakWise AI provides a safe,
                  judgment-free zone to practice, fail, and improve.
                </p>
              </section>

              {/* The Vision Section */}
              <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400">
                    <Heart className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    The Vision
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  To become the standard toolkit for career readiness. By
                  combining advanced Large Language Models with speech
                  recognition, we aim to make high-quality communication
                  coaching accessible to everyone, regardless of their
                  background.
                </p>
              </section>
            </div>
          </div>
        </div>
        <SiteFooter />
      </main>
    </div>
  );
}
