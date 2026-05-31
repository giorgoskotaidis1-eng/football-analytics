"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileUploadModal } from "../components/FileUploadModal";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type UploadedFile = {
  id: number;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  storageKey: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

type SortBy = "updatedAt" | "name" | "size";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function FileManagerPage() {
  const { t } = useTranslation();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      params.set("sortBy", sortBy);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const url = `/api/files${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToLoadFiles") || "Failed to load files");
        setFiles([]);
        return;
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch {
      toast.error(t("failedToLoadFiles") || "Failed to load files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, sortBy, debouncedSearch, t]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function deleteFile(id: number) {
    if (!confirm(t("confirmDeleteFile") || "Delete this file?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/files?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToDeleteFile") || "Failed to delete file");
        return;
      }
      toast.success(t("fileDeleted") || "File deleted");
      await loadFiles();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  const hasActiveFilters = useMemo(
    () => Boolean(searchQuery || filterCategory !== "all"),
    [searchQuery, filterCategory]
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                  {t("tools")}
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                  {t("documents")}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("documentsDescription")}</p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("uploadFile")}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters Panel */}
          <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("filter")}
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="h-12 w-48 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="all">{t("allTypes")}</option>
                    <option value="report">{t("report")}</option>
                    <option value="schedule">{t("schedule")}</option>
                    <option value="data">{t("data")}</option>
                    <option value="other">{t("other") || "Other"}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("sortBy")}
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="h-12 w-48 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="updatedAt">{t("lastModified")}</option>
                    <option value="name">{t("name")}</option>
                    <option value="size">{t("size")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("search")}
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchFiles")}
                    className="h-12 w-64 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setFilterCategory("all");
                      }}
                      className="h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
                    >
                      {t("clear")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Files Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50 dark:via-slate-950/50 to-white dark:to-slate-950/50 overflow-hidden shadow-xl">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("documentList")}</h2>
            </div>
            <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: "visible" }}>
              <table className="w-full border-collapse text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("name")}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">{t("filter")}</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide">{t("size")}</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide">
                      {t("lastModified")}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                        {t("loading")}
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700">
                            <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-slate-900 dark:text-white">
                              {hasActiveFilters
                                ? t("noFilesForFilter") || "No files match the selected filters."
                                : t("noDocumentsYet")}
                            </p>
                            {!hasActiveFilters && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">{t("uploadFirstDocument")}</p>
                            )}
                          </div>
                          {!hasActiveFilters && (
                            <button
                              onClick={() => setShowUploadModal(true)}
                              className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              {t("uploadFirstDocumentButton")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    files.map((file) => (
                      <tr key={file.id} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                        <td className="px-6 py-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.originalName}</p>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-600 dark:text-slate-400 capitalize">{file.category}</td>
                        <td className="px-6 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                          {formatBytes(file.size)}
                        </td>
                        <td className="px-6 py-3 text-right text-xs text-slate-600 dark:text-slate-400">
                          {new Date(file.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.originalName}
                              className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20"
                            >
                              {t("download") || "Download"}
                            </a>
                            <button
                              onClick={() => deleteFile(file.id)}
                              disabled={deletingId === file.id}
                              className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === file.id ? t("deleting") || "Deleting..." : t("delete") || "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          void loadFiles();
        }}
      />
    </>
  );
}
