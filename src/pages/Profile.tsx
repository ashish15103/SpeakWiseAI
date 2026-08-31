// Profile.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Shield,
  Sparkles,
  Camera,
  Globe,
  Save,
  BarChart3,
  Calendar,
} from "lucide-react";
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram } from "react-icons/fa";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";

interface ProfileForm {
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  twitterUrl: string;
  instagramUrl: string;
}

export default function Profile() {
  const [user, setUser] = useState({
    name: "Loading...",
    email: "",
    avatarUrl: "",
  });

  const [userId, setUserId] = useState("");
  const [joinDate, setJoinDate] = useState("Recently");
  const [totalSessions, setTotalSessions] = useState(0);

  const [form, setForm] = useState<ProfileForm>({
    displayName: "",
    username: "",
    bio: "",
    avatarUrl: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
    twitterUrl: "",
    instagramUrl: "",
  });

  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;

      const u = session.user;

      const name =
        u.user_metadata?.full_name ??
        u.user_metadata?.name ??
        u.email?.split("@")[0] ??
        "User";

      setUser({
        name,
        email: u.email ?? "",
        avatarUrl: u.user_metadata?.avatar_url ?? "",
      });

      setUserId(u.id);

      setForm({
        displayName: name,
        username: u.user_metadata?.username ?? "",
        bio: u.user_metadata?.bio ?? "",
        avatarUrl: u.user_metadata?.avatar_url ?? "",
        githubUrl: u.user_metadata?.github_url ?? "",
        linkedinUrl: u.user_metadata?.linkedin_url ?? "",
        portfolioUrl: u.user_metadata?.portfolio_url ?? "",
        twitterUrl: u.user_metadata?.twitter_url ?? "",
        instagramUrl: u.user_metadata?.instagram_url ?? "",
      });

      setAvatarPreview(u.user_metadata?.avatar_url ?? "");

      setTotalSessions(u.user_metadata?.total_sessions ?? 0);

      if (u.created_at) {
        const date = new Date(u.created_at);

        setJoinDate(
          date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        );
      }
    });
  }, []);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileCompletion = useMemo(() => {
    const fields = [
      avatarPreview,
      form.displayName,
      form.username,
      form.bio,
      form.githubUrl,
      form.linkedinUrl,
      form.portfolioUrl,
      form.twitterUrl,
      form.instagramUrl,
    ];

    const completed = fields.filter((f) => f && f.trim().length > 0).length;

    return Math.round((completed / fields.length) * 100);
  }, [form, avatarPreview]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setMessage("");
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Image must be smaller than 5 MB.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${userId}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("Avatar")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("Avatar")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      setForm((prev) => ({
        ...prev,
        avatarUrl: publicUrl,
      }));

      setAvatarPreview(publicUrl);

      setMessage("Profile picture uploaded. Click Save Changes to apply it.");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to upload profile picture.",
      );
    } finally {
      setUploading(false);
    }
  }

  function validateUsername(username: string) {
    const value = username.trim();

    if (!value) return "Username is required.";

    if (value.length < 3) {
      return "Username must be at least 3 characters.";
    }

    if (value.length > 20) {
      return "Username must be 20 characters or less.";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return "Username can only contain letters, numbers, and underscores.";
    }

    return "";
  }

  async function handleSave() {
    const usernameError = validateUsername(form.username);

    if (usernameError) {
      setMessage(usernameError);
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: form.displayName,
          username: form.username,
          bio: form.bio,
          avatar_url: form.avatarUrl,
          github_url: form.githubUrl,
          linkedin_url: form.linkedinUrl,
          portfolio_url: form.portfolioUrl,
          twitter_url: form.twitterUrl,
          instagram_url: form.instagramUrl,
        },
      });

      if (error) throw error;

      setUser((prev) => ({
        ...prev,
        name: form.displayName,
        avatarUrl: form.avatarUrl,
      }));

      setMessage("Profile updated successfully.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const isErrorMessage =
    message.toLowerCase().includes("failed") ||
    message.toLowerCase().includes("error") ||
    message.toLowerCase().includes("must") ||
    message.toLowerCase().includes("required");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AppSidebar user={user} />

      <main className="relative flex-1 overflow-y-auto">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-100/50 to-transparent dark:from-violet-900/10" />

        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-20 sm:px-6 sm:py-12">
          {" "}
          {/* Profile heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Profile
            </h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage your public profile and account details.
            </p>
          </div>
          {/* =========================================================
              PROFILE COMPLETION
              Mobile: compact single line
              Desktop: existing larger card
          ========================================================= */}
          <div className="mb-4 rounded-xl border border-violet-100 bg-white px-3 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mb-8 sm:rounded-2xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500 sm:h-4 sm:w-4" />

                    <h3 className="truncate text-xs font-semibold text-gray-800 dark:text-white sm:text-base">
                      Profile completion
                    </h3>
                  </div>

                  <span className="shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400 sm:text-lg">
                    {profileCompletion}%
                  </span>
                </div>

                {/* Small progress bar */}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 sm:mt-4 sm:h-2.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 ease-out"
                    style={{
                      width: `${profileCompletion}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* =========================================================
              MAIN PROFILE CARD
          ========================================================= */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* Banner */}
            <div className="h-20 bg-gradient-to-r from-violet-500 to-purple-600 sm:h-40" />

            <div className="px-4 pb-6 sm:px-10 sm:pb-10">
              {/* Avatar + membership */}
              <div className="relative -mt-10 mb-4 flex items-end justify-between sm:-mt-20 sm:mb-6">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-100 to-purple-100 text-xl font-bold text-violet-700 shadow-md dark:border-gray-900 dark:from-violet-900 dark:to-purple-900 dark:text-violet-300 sm:h-32 sm:w-32 sm:text-4xl">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-2 ring-violet-100 transition hover:scale-105 dark:bg-gray-800 dark:text-gray-200 dark:ring-violet-900 sm:bottom-1 sm:right-1 sm:h-9 sm:w-9"
                    title="Change profile picture"
                  >
                    <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800 sm:mb-2 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-xs">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Pro Member
                </span>
              </div>

              {uploading && (
                <p className="mb-3 text-xs text-gray-400">
                  Uploading profile picture...
                </p>
              )}

              {/* User identity */}
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                    {user.name}
                  </h2>

                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {form.username
                      ? `@${form.username}`
                      : "Add a username below"}
                  </p>
                </div>

                {/* Account information */}
                <div className="grid gap-2 border-t border-gray-100 pt-4 dark:border-gray-800 sm:grid-cols-2 sm:gap-4 sm:pt-5">
                  <div className="flex min-w-0 items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Mail className="h-4 w-4 text-violet-500" />
                    </div>

                    <span className="truncate">{user.email}</span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Shield className="h-4 w-4 text-violet-500" />
                    </div>

                    <span>Joined {joinDate}</span>
                  </div>
                </div>
              </div>

              {/* =====================================================
                  BASIC INFORMATION
              ===================================================== */}
              <section className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800 sm:mt-10 sm:pt-8">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                    Basic information
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                    Update the information shown on your profile.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
                  <FormField
                    label="Full name"
                    value={form.displayName}
                    placeholder="Enter your full name"
                    onChange={(v) => updateField("displayName", v)}
                  />

                  <FormField
                    label="Username"
                    value={form.username}
                    placeholder="Enter your username"
                    prefix="@"
                    onChange={(v) => updateField("username", v)}
                  />
                </div>

                <div className="mt-4 sm:mt-5">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bio
                  </label>

                  <textarea
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Tell us a little about yourself..."
                    rows={3}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-gray-300 px-3.5 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white sm:px-4"
                  />

                  <p className="mt-1 text-right text-[11px] text-gray-400">
                    {form.bio.length}/300
                  </p>
                </div>
              </section>

              {/* =====================================================
                  SOCIAL LINKS
              ===================================================== */}
              <section className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-800 sm:mt-10 sm:pt-8">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                  Social links
                </h3>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                  Add links you want to show on your profile.
                </p>

                <div className="mt-4 grid gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
                  <SocialField
                    icon={FaGithub}
                    label="GitHub"
                    value={form.githubUrl}
                    placeholder="https://github.com/username"
                    onChange={(v) => updateField("githubUrl", v)}
                  />

                  <SocialField
                    icon={FaLinkedin}
                    label="LinkedIn"
                    value={form.linkedinUrl}
                    placeholder="https://linkedin.com/in/username"
                    onChange={(v) => updateField("linkedinUrl", v)}
                  />

                  <SocialField
                    icon={Globe}
                    label="Portfolio"
                    value={form.portfolioUrl}
                    placeholder="https://yourportfolio.com"
                    onChange={(v) => updateField("portfolioUrl", v)}
                  />

                  <SocialField
                    icon={FaTwitter}
                    label="Twitter / X"
                    value={form.twitterUrl}
                    placeholder="https://x.com/username"
                    onChange={(v) => updateField("twitterUrl", v)}
                  />

                  <SocialField
                    icon={FaInstagram}
                    label="Instagram"
                    value={form.instagramUrl}
                    placeholder="https://instagram.com/username"
                    onChange={(v) => updateField("instagramUrl", v)}
                  />
                </div>
              </section>

              {/* =====================================================
                  SAVE
              ===================================================== */}
              <div className="mt-6 border-t border-gray-100 pt-5 dark:border-gray-800 sm:mt-10 sm:pt-6">
                {message && (
                  <p
                    className={`mb-3 text-xs sm:text-sm ${
                      isErrorMessage ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {message}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50 sm:w-auto sm:rounded-lg sm:py-2"
                  >
                    <Save className="h-4 w-4" />

                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* =========================================================
              ACCOUNT ACTIVITY
          ========================================================= */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mt-8">
            <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 sm:h-10 sm:w-10 sm:rounded-xl">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                    Account activity
                  </h3>

                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:mt-1 sm:text-sm">
                    Your account information and activity overview.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="flex items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800 sm:border-b-0 sm:border-r sm:p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">
                    Joined
                  </p>

                  <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {joinDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 sm:p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <BarChart3 className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 sm:text-xs">
                    Total sessions
                  </p>

                  <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {totalSessions}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom breathing room on mobile */}
          <div className="h-5 sm:h-0" />
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function FormField({
  label,
  value,
  placeholder,
  prefix,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  prefix?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {prefix}
          </span>
        )}

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-300 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white ${
            prefix ? "pl-8 pr-4" : "px-3.5 sm:px-4"
          }`}
        />
      </div>
    </div>
  );
}

/* ============================================================
   SOCIAL FIELD
============================================================ */

function SocialField({
  icon: Icon,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
      </div>
    </div>
  );
}
