// Profile.tsx
import { useEffect, useMemo, useState } from "react";
// Remove Github, Linkedin, Twitter, Instagram from this lucide-react import:
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

// Add this:
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

      // Replace with a real sessions count from your own table if you track one
      setTotalSessions(u.user_metadata?.total_sessions ?? 0);

      if (u.created_at) {
        const date = new Date(u.created_at);
        setJoinDate(
          date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
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
    setForm((prev) => ({ ...prev, [field]: value }));
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
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrlData } = supabase.storage
        .from("Avatar")
        .getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
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
    if (value.length < 3) return "Username must be at least 3 characters.";
    if (value.length > 20) return "Username must be 20 characters or less.";
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

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AppSidebar user={user} />

      <main className="flex-1 overflow-y-auto relative">
        <div className="pointer-events-none absolute inset-0 h-64 bg-gradient-to-b from-violet-100/50 to-transparent dark:from-violet-900/10" />

        <div className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Profile
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage your public profile and account details.
            </p>
          </div>

          {/* Profile completion */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Profile completion
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Complete your profile to get the most out of your account.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {profileCompletion}%
                </p>
                <p className="text-xs text-gray-400">complete</p>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* Header Banner */}
            <div className="h-32 bg-gradient-to-r from-violet-500 to-purple-600 sm:h-40" />

            <div className="px-6 sm:px-10 pb-10">
              <div className="relative -mt-16 sm:-mt-20 mb-6 flex justify-between items-end">
                <div className="relative">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-violet-100 to-purple-100 text-4xl font-bold text-violet-700 shadow-md dark:border-gray-900 dark:from-violet-900 dark:to-purple-900 dark:text-violet-300 overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={user.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-2 ring-violet-100 transition hover:scale-110 dark:bg-gray-800 dark:text-gray-200 dark:ring-violet-900"
                    title="Change profile picture"
                  >
                    <Camera className="h-4 w-4" />
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

                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pro Member
                </span>
              </div>

              {uploading && (
                <p className="mb-4 text-xs text-gray-400">
                  Uploading profile picture...
                </p>
              )}

              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.username
                      ? `@${form.username}`
                      : "Add a username below"}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <Mail className="h-5 w-5 text-gray-400" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                    <Shield className="h-5 w-5 text-gray-400" />
                    Joined {joinDate}
                  </div>
                </div>
              </div>

              {/* Basic information */}
              <section className="mt-10 border-t border-gray-100 pt-8 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic information
                </h3>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
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

                <div className="mt-5">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Tell us a little about yourself..."
                    rows={4}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {form.bio.length}/300
                  </p>
                </div>
              </section>

              {/* Social links */}
              <section className="mt-10 border-t border-gray-100 pt-8 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Social links
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add links you want to show on your profile.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
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

              {/* Save */}
              <div className="mt-10 border-t border-gray-100 pt-6 dark:border-gray-800">
                {message && (
                  <p
                    className={`mb-4 text-sm ${
                      message.toLowerCase().includes("failed") ||
                      message.toLowerCase().includes("error") ||
                      message.toLowerCase().includes("must") ||
                      message.toLowerCase().includes("required")
                        ? "text-red-500"
                        : "text-green-600"
                    }`}
                  >
                    {message}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving || uploading}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account activity */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Account activity
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Your account information and activity overview.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2">
              <div className="flex items-center gap-3 border-b border-gray-100 p-6 sm:border-b-0 sm:border-r dark:border-gray-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Joined
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {joinDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Total sessions
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {totalSessions}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

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
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {prefix}
          </span>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-gray-300 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white ${
            prefix ? "pl-8 pr-4" : "px-4"
          }`}
        />
      </div>
    </div>
  );
}

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
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
