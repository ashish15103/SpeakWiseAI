import { Link, useLocation } from "react-router-dom";
import { Sparkles, Mail } from "lucide-react";
import { FaGithub, FaTwitter } from "react-icons/fa";

export function SiteFooter() {
  const location = useLocation();
  const year = new Date().getFullYear();

  // 🛑 The Magic Rule: Only render on these specific pages
  const allowedPaths = ["/", "/dashboard", "/about", "/project-details"];

  if (!allowedPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/50">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                SpeakWise
                <span className="bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
                  {" "}
                  AI
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-gray-500 dark:text-gray-400">
              AI-powered learning companion for students — solve doubts, ace
              interviews and master communication.
            </p>
            <div className="mt-5 flex gap-2">
              <SocialIcon
                icon={FaGithub}
                href="https://github.com/ashish15103"
                label="GitHub"
              />
              <SocialIcon
                icon={FaTwitter}
                href="https://x.com/ashish15103"
                label="Twitter"
              />
              <SocialIcon
                icon={Mail}
                href="mailto:monukumar15103@gmail.com"
                label="Email"
              />
            </div>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { to: "/doubt-solver", label: "Doubt Solver" },
              { to: "/mock-interview", label: "Mock Interview" },
              { to: "/communication", label: "Communication" },
              { to: "/dashboard", label: "Dashboard" },
            ]}
          />

          <FooterColumn
            title="Account"
            links={[
              { to: "/profile", label: "Profile" },
              { to: "/auth", label: "Sign in" },
              { to: "/project-details", label: "Project details" },
              { to: "/about", label: "About" },
            ]}
          />

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Built with
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li>React · React Router</li>
              <li>Tailwind CSS v4</li>
              <li>Supabase · Gemini AI</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row">
          <p>© {year} SpeakWise AI · Made for students, by students.</p>
          <p>Crafted with care · v2.0</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 👈 Change the icon type to React.ElementType
function SocialIcon({
  icon: Icon,
  href,
  label,
}: {
  icon: React.ElementType;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}
