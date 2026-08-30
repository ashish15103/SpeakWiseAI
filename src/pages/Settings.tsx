// Settings.tsx
import { useEffect, useState } from "react";
import {
  User,
  Bell,
  Palette,
  LockKeyhole,
  Loader2,
  Save,
  Moon,
  Sun,
  Monitor,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { AppSidebar } from "../components/AppSidebar";
import { supabase } from "../integrations/supabase/client";
import { useTheme } from "../components/theme-provider";

export default function Settings() {
  const [user, setUser] = useState({ name: "", email: "", avatarUrl: "" });
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "account" | "appearance" | "security"
  >("account");
  const { theme, setTheme } = useTheme();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

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
      setFullName(name);
    });
  }, []);

  async function handleSaveProfile() {
    if (!fullName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) throw error;
      setUser((prev) => ({ ...prev, name: fullName }));
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange() {
    setPasswordMessage("");

    if (!currentPassword)
      return setPasswordMessage("Please enter your current password.");
    if (!newPassword) return setPasswordMessage("Please enter a new password.");
    if (newPassword.length < 6)
      return setPasswordMessage("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword)
      return setPasswordMessage("New passwords do not match.");
    if (currentPassword === newPassword) {
      return setPasswordMessage(
        "New password must be different from your current password.",
      );
    }

    try {
      setPasswordSaving(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser?.email) {
        setPasswordMessage("Unable to identify your account.");
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword,
      });
      if (verifyError) {
        setPasswordMessage("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setPasswordMessage(updateError.message);
        return;
      }

      setPasswordMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordMessage(
        err instanceof Error ? err.message : "Failed to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <AppSidebar user={user} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Manage your account settings and preferences.
            </p>
          </div>

          <div className="flex flex-col gap-8 md:flex-row">
            <aside className="w-full md:w-64 shrink-0 space-y-1">
              <button
                onClick={() => setActiveTab("account")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "account"
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <User className="h-4 w-4" /> Account
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "security"
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <LockKeyhole className="h-4 w-4" /> Security
              </button>

              <button
                onClick={() => setActiveTab("appearance")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  activeTab === "appearance"
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Palette className="h-4 w-4" /> Appearance
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 opacity-50 cursor-not-allowed dark:text-gray-400">
                <Bell className="h-4 w-4" /> Notifications (Soon)
              </button>
            </aside>

            <div className="flex-1 space-y-6">
              {/* ACCOUNT TAB */}
              {activeTab === "account" && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Profile Information
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Update your account's profile information.
                    </p>
                  </div>

                  <div className="px-6 py-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full max-w-md rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full max-w-md rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-500 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Your email address cannot be changed.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-end rounded-b-2xl dark:border-gray-800 dark:bg-gray-900/50">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading || fullName === user.name}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Change Password
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose a strong password that you don't use elsewhere.
                    </p>
                  </div>

                  <div className="px-6 py-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current password
                      </label>
                      <div className="relative max-w-md">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            setPasswordMessage("");
                          }}
                          placeholder="Enter your current password"
                          autoComplete="off"
                          name="verification-password"
                          className="w-full rounded-xl border border-gray-300 py-2.5 pl-4 pr-11 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((p) => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2 max-w-md sm:max-w-none">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          New password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              setPasswordMessage("");
                            }}
                            placeholder="Enter new password"
                            autoComplete="new-password"
                            name="new-password"
                            className="w-full rounded-xl border border-gray-300 py-2.5 pl-4 pr-11 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              setPasswordMessage("");
                            }}
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                            name="confirm-password"
                            className="w-full rounded-xl border border-gray-300 py-2.5 pl-4 pr-11 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((p) => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {passwordMessage && (
                      <p
                        className={`text-sm ${
                          passwordMessage.toLowerCase().includes("success")
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {passwordMessage}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-end rounded-b-2xl dark:border-gray-800 dark:bg-gray-900/50">
                    <button
                      onClick={handlePasswordChange}
                      disabled={passwordSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      <LockKeyhole className="h-4 w-4" />
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </div>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === "appearance" && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Theme Preferences
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose how SpeakWise AI looks to you.
                    </p>
                  </div>

                  <div className="px-6 py-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          theme === "light"
                            ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <Sun className="h-6 w-6" />
                        <span className="text-sm font-medium">Light</span>
                      </button>

                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          theme === "dark"
                            ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <Moon className="h-6 w-6" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>

                      <button
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          theme === "system"
                            ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300"
                            : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <Monitor className="h-6 w-6" />
                        <span className="text-sm font-medium">System</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
