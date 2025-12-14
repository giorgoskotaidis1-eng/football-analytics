"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  
  return (
    <select 
      value={theme}
      onChange={(e) => setTheme(e.target.value as "light" | "dark")}
      className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-slate-900/80"
    >
      <option value="dark">{t("dark")}</option>
      <option value="light">{t("light")}</option>
    </select>
  );
}

type AccountState = {
  name: string;
  email: string;
  role: string;
  joinedAt?: string | null;
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  profilePicture?: string | null;
};

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const router = useRouter();
  const [account, setAccount] = useState<AccountState | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [isPwdSaving, startPwdSaving] = useTransition();
  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneMessage, setPhoneMessage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isPhoneSubmitting, startPhoneSubmitting] = useTransition();
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  function getPasswordStrengthLabel(pwd: string): { label: string; level: "weak" | "medium" | "strong" } {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd) || /[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: "Weak", level: "weak" };
    if (score === 2) return { label: "Medium", level: "medium" };
    return { label: "Strong", level: "strong" };
  }

  function handleSendPhoneCode(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setPhoneMessage(null);
    setPhoneError(null);

    const value = phone || account.phone || "";
    if (!value) {
      setPhoneError(t("pleaseEnterPhoneNumber"));
      return;
    }

    startPhoneSubmitting(async () => {
      try {
        const res = await fetch("/api/auth/phone/send-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": account.email,
          },
          body: JSON.stringify({ phone: value }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setPhoneError(data.error || "Failed to send SMS code.");
          return;
        }
        setPhoneMessage(t("ifSmsConfigured"));
      } catch {
        setPhoneError("Network error while sending code.");
      }
    });
  }

  function handleVerifyPhoneCode(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setPhoneMessage(null);
    setPhoneError(null);

    if (!phoneCode) {
      setPhoneError(t("pleaseEnterVerificationCode"));
      return;
    }

    startPhoneSubmitting(async () => {
      try {
        const res = await fetch("/api/auth/phone/verify-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": account.email,
          },
          body: JSON.stringify({ code: phoneCode }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setPhoneError(data.error || "Failed to verify code.");
          return;
        }
        setPhoneMessage(t("phoneNumberVerified"));
        setAccount((prev) => (prev ? { ...prev, phoneVerified: true } : prev));
      } catch {
        setPhoneError("Network error while verifying code.");
      }
    });
  }

  const pwdStrength = newPassword ? getPasswordStrengthLabel(newPassword) : null;

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch("/api/account/me");
        if (!res.ok) {
          router.replace("/auth/login");
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          user?: {
            email?: string;
            name?: string | null;
            role?: string | null;
            createdAt?: string;
            emailVerified?: boolean;
            phone?: string | null;
            phoneVerified?: boolean;
            profilePicture?: string | null;
          };
        };
        if (res.ok && data.ok && data.user?.email) {
          setAccount({
            email: data.user.email,
            name: data.user.name || "",
            role: data.user.role || t("headCoach"),
            joinedAt: data.user.createdAt ?? null,
            emailVerified: data.user.emailVerified,
            phone: data.user.phone || "",
            phoneVerified: data.user.phoneVerified,
            profilePicture: data.user.profilePicture || null,
          });
        } else {
          router.replace("/auth/login");
        }
      } catch {
        router.replace("/auth/login");
      } finally {
        setLoadingAccount(false);
      }
    }
    loadAccount();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/auth/login");
    router.refresh();
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);
    setUploadingPicture(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/profile-picture", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setUploadSuccess(t("profilePictureUploadedSuccessfully"));
        // Update account state with new picture
        if (account) {
          setAccount({ ...account, profilePicture: data.url });
        }
        // Refresh page after 1 second
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setUploadError(data.message || "Failed to upload picture");
      }
    } catch (error) {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploadingPicture(false);
      // Reset input
      e.target.value = "";
    }
  }

  function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSaveMessage(null);
    setSaveError(null);

    startSaving(async () => {
      try {
        const res = await fetch("/api/account/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": account.email,
          },
          body: JSON.stringify({ name: account.name, role: account.role }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setSaveError(data.message || "Failed to update account");
          return;
        }
        setSaveMessage(t("accountDetailsUpdated"));
      } catch {
        setSaveError("Network error while saving");
      }
    });
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setPwdMessage(null);
    setPwdError(null);

    if (!currentPassword || !newPassword) {
      setPwdError("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match");
      return;
    }

    startPwdSaving(async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-email": account.email,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (!res.ok || !data.ok) {
          setPwdError(data.message || "Failed to update password");
          return;
        }
        setPwdMessage(t("passwordUpdatedSuccessfully"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch {
        setPwdError("Network error while updating password");
      }
    });
  }

  return (
    <div className="grid gap-6 md:gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] text-xs text-slate-200">
      <div className="space-y-6">
        {/* Header - Premium */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/80 via-slate-950/90 to-slate-900/80 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5"></div>
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{t("profileAndSecurity")}</p>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">{t("accountSettings")}</h1>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  {t("manageYourPersonalDetails")}
                </p>
              </div>
            </div>

            {account && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-5 shadow-lg">
                <div className="flex items-center gap-4">
                  {account.profilePicture ? (
                    <img
                      src={account.profilePicture}
                      alt={account.name || account.email}
                      className="h-12 w-12 rounded-xl object-cover border-2 border-slate-700/50 shadow-lg"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-lg font-bold text-slate-950 shadow-lg">
                      {(account.name || account.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">
                      {account.name || account.email}
                    </p>
                    <p className="text-xs text-slate-400 truncate max-w-[200px]">{account.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap gap-2 justify-end">
                    <span className="rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 px-3 py-1.5 text-[10px] font-semibold text-slate-200 shadow-sm">
                      {account.role || t("headCoach")}
                    </span>
                    <span
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold shadow-sm ${
                        account.emailVerified
                          ? "border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-300"
                          : "border border-amber-500/50 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-200"
                      }`}
                    >
                      {account.emailVerified ? t("emailVerified") : t("emailPending")}
                    </span>
                    <span
                      className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold shadow-sm ${
                        account.phoneVerified
                          ? "border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-300"
                          : "border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 text-slate-300"
                      }`}
                    >
                      {account.phoneVerified ? t("phoneVerified") : t("phoneNotVerified")}
                    </span>
                  </div>
                  {account.joinedAt && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      {t("joined")} {new Date(account.joinedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Picture Upload - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white">{t("profilePicture")}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                {account?.profilePicture ? (
                  <div className="relative">
                    <img
                      src={account.profilePicture}
                      alt="Profile"
                      className="h-24 w-24 rounded-2xl object-cover border-2 border-slate-700/50 shadow-xl"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent"></div>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-3xl font-bold text-slate-950 shadow-xl border-2 border-slate-700/50">
                    {(account?.name || account?.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handlePictureUpload}
                      disabled={uploadingPicture}
                      className="hidden"
                      id="profile-picture-input"
                    />
                    <span className="inline-flex items-center gap-2 h-10 rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-5 text-xs font-semibold text-slate-200 hover:from-slate-700/50 hover:to-slate-800/50 hover:border-slate-600/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md">
                      {uploadingPicture ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>{t("uploading")}</span>
                        </>
                      ) : account?.profilePicture ? (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>{t("changePicture")}</span>
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>{t("uploadPicture")}</span>
                        </>
                      )}
                    </span>
                  </label>
                  <p className="text-xs text-slate-500 font-medium">
                    {t("jpegPngOrWebpMax5mb")}
                  </p>
                </div>
              </div>
              {uploadError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5">
                  <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-400 font-medium">{uploadError}</p>
                </div>
              )}
              {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5">
                  <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-400 font-medium">{uploadSuccess}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form - Premium */}
        <form
          onSubmit={handleAccountSave}
          className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-emerald-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white">{t("profile")}</p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("fullName")}</label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80"
                    placeholder={t("coachAnalystName")}
                    value={account?.name || ""}
                    disabled={loadingAccount}
                    onChange={(e) =>
                      setAccount((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("role")}</label>
                  <select
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80"
                    value={account?.role || t("headCoach")}
                    disabled={loadingAccount}
                    onChange={(e) =>
                      setAccount((prev) => (prev ? { ...prev, role: e.target.value } : prev))
                    }
                  >
                    <option>{t("headCoach")}</option>
                    <option>{t("assistantCoach")}</option>
                    <option>{t("performanceAnalyst")}</option>
                    <option>{t("scout")}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("contactEmail")}</label>
                <input
                  className="h-10 w-full cursor-not-allowed rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/40 to-slate-950/40 px-4 text-sm text-slate-500 outline-none"
                  value={account?.email || ""}
                  disabled
                />
              </div>
              <button
                type="submit"
                disabled={loadingAccount || isSaving}
                className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-400 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t("savingChanges")}</span>
                  </span>
                ) : (
                  t("saveChanges")
                )}
              </button>
              {saveMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5">
                  <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-400 font-medium">{saveMessage}</p>
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5">
                  <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-400 font-medium">{saveError}</p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Preferences - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white">{t("preferences")}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("language")}</label>
                <select 
                  className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:bg-slate-900/80"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "en" | "gr")}
                >
                  <option value="en">{t("english")}</option>
                  <option value="gr">{t("greek")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("theme")}</label>
                <ThemeSelector />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("notifications")}</label>
                <select className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-slate-900/80">
                  <option>{t("allEvents")}</option>
                  <option>{t("importantOnly")}</option>
                  <option>{t("muted")}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-amber-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t("subscription")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("manageYourPlanAndBillingDetails")}</p>
                </div>
              </div>
              <span className="rounded-xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-4 py-2 text-xs font-bold text-emerald-300 shadow-lg shadow-emerald-500/20">
                {t("currentPlan")}: {t("pro")}
              </span>
            </div>
            <div className="flex justify-end">
              <a
                href="/billing"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-5 py-2.5 text-xs font-semibold text-slate-100 hover:from-slate-700/50 hover:to-slate-800/50 hover:border-slate-600/50 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t("manageBilling")}
              </a>
            </div>
          </div>
        </div>

        {/* Security - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-red-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white">{t("security")}</p>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("currentPassword")}</label>
                <input
                  type="password"
                  className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 focus:bg-slate-900/80"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("newPassword")}</label>
                  <input
                    type="password"
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 font-medium">
                    {t("useAtLeast8Characters")}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("confirmNewPassword")}</label>
                  <input
                    type="password"
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 font-medium">{t("reEnterNewPassword")}</p>
                </div>
              </div>
              {pwdStrength && (
                <div className="space-y-2 p-4 rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-800/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-400">{t("passwordStrength")}</span>
                    <span
                      className={`font-bold ${
                        pwdStrength.level === "weak"
                          ? "text-red-400"
                          : pwdStrength.level === "medium"
                          ? "text-amber-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {pwdStrength.level === "weak" ? t("weak") : pwdStrength.level === "medium" ? t("medium") : t("strong")}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-900/50 border border-slate-800/50">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pwdStrength.level === "weak"
                          ? "w-1/3 bg-gradient-to-r from-red-500 to-red-600"
                          : pwdStrength.level === "medium"
                          ? "w-2/3 bg-gradient-to-r from-amber-400 to-amber-500"
                          : "w-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      }`}
                    />
                  </div>
                </div>
              )}
              <button
                type="submit"
                disabled={!account || isPwdSaving}
                className="mt-2 h-10 w-full rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 text-sm font-bold text-slate-900 shadow-lg shadow-slate-500/20 transition-all hover:from-white hover:to-slate-100 hover:shadow-slate-500/30 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                {isPwdSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t("updatingPassword")}</span>
                  </span>
                ) : (
                  t("updatePassword")
                )}
              </button>
              {pwdMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5">
                  <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-400 font-medium">{pwdMessage}</p>
                </div>
              )}
              {pwdError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5">
                  <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-400 font-medium">{pwdError}</p>
                </div>
              )}
            </form>
          </div>
        </div>
        {/* Phone Verification - Premium */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-cyan-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <svg className="h-5 w-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t("phoneVerification")}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {t("addPhoneNumberToReceive")}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <form className="space-y-3" onSubmit={handleSendPhoneCode}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("phoneNumber")}</label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900/80"
                    placeholder="+30 69xxxxxxxx"
                    value={phone || account?.phone || ""}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPhoneSubmitting}
                  className="h-10 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:from-cyan-500 hover:to-blue-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {isPhoneSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t("sendingCode")}</span>
                    </span>
                  ) : (
                    t("sendVerificationCode")
                  )}
                </button>
              </form>
              <form className="space-y-3" onSubmit={handleVerifyPhoneCode}>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("verificationCode")}</label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 px-4 text-sm text-slate-100 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80"
                    placeholder={t("sixDigitCode")}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPhoneSubmitting}
                  className="h-10 w-full rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 text-sm font-bold text-slate-200 hover:from-slate-700/50 hover:to-slate-800/50 hover:border-slate-600/50 transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPhoneSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
                      <span>{t("verifying")}</span>
                    </span>
                  ) : (
                    t("verifyCode")
                  )}
                </button>
              </form>
              {phoneMessage && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5">
                  <svg className="h-4 w-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-emerald-400 font-medium">{phoneMessage}</p>
                </div>
              )}
              {phoneError && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5">
                  <svg className="h-4 w-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-red-400 font-medium">{phoneError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session & Privacy - Premium */}
      <aside className="group relative overflow-hidden rounded-2xl border border-slate-800/50 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-slate-900/90 p-6 shadow-2xl transition-all hover:shadow-indigo-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <svg className="h-5 w-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-white">{t("sessionAndPrivacy")}</p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            {t("controlHowYourDataIsUsed")}
          </p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mt-0.5">
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t("gdprReadyDataProcessing")}</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mt-0.5">
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t("secureLogoutFromAllDevices")}</p>
            </li>
            <li className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center mt-0.5">
                <svg className="h-3 w-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t("fineGrainedAccessLevels")}</p>
            </li>
          </ul>
          <button
            onClick={handleLogout}
            className="mt-2 h-10 w-full rounded-xl border border-red-500/50 bg-gradient-to-r from-red-500/10 to-red-600/5 text-sm font-bold text-red-300 shadow-lg shadow-red-500/10 transition-all hover:from-red-500/20 hover:to-red-600/10 hover:border-red-500/70 hover:shadow-red-500/20 hover:scale-[1.02]"
          >
            {t("logoutFromAllDevices")}
          </button>
        </div>
      </aside>
    </div>
  );
}
