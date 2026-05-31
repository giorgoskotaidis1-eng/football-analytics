"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExportModal } from "../components/ExportModal";
import toast, { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

type DataExportEntry = {
  id: number;
  source: string;
  format: string;
  scopeLabel: string;
  status: string;
  downloadKey: string | null;
  downloadUrl: string | null;
  fileSize: number | null;
  createdAt: string;
  completedAt: string | null;
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DataHubPage() {
  const { t } = useTranslation();
  const [showExportModal, setShowExportModal] = useState(false);
  const [exports, setExports] = useState<DataExportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState("all");
  const [filterFormat, setFilterFormat] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadExports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSource !== "all") params.set("source", filterSource);
      if (filterFormat !== "all") params.set("format", filterFormat);
      const url = `/api/exports${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToLoadExports") || "Failed to load exports");
        setExports([]);
        return;
      }
      setExports(Array.isArray(data.exports) ? data.exports : []);
    } catch {
      toast.error(t("failedToLoadExports") || "Failed to load exports");
      setExports([]);
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterFormat, t]);

  useEffect(() => {
    void loadExports();
  }, [loadExports]);

  async function deleteExport(id: number) {
    if (!confirm(t("confirmDeleteExport") || "Delete this export?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/exports?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message || t("failedToDeleteExport") || "Failed to delete export");
        return;
      }
      toast.success(t("exportDeleted") || "Export deleted");
      await loadExports();
    } catch {
      toast.error(t("anErrorOccurred") || "An error occurred");
    } finally {
      setDeletingId(null);
    }
  }

  const hasActiveFilters = useMemo(
    () => filterSource !== "all" || filterFormat !== "all",
    [filterSource, filterFormat]
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
                  {t("exports")}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t("exportsDescription")}</p>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("newExport")}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters */}
          <div className="mb-6 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Source</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="h-12 w-48 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">{t("allSources") || "All sources"}</option>
                  <option value="matches">{t("matches") || "Matches"}</option>
                  <option value="players">{t("players") || "Players"}</option>
                  <option value="statistics">{t("statistics") || "Statistics"}</option>
                  <option value="squad">{t("squadMetrics") || "Squad metrics"}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">Format</label>
                <select
                  value={filterFormat}
                  onChange={(e) => setFilterFormat(e.target.value)}
                  className="h-12 w-48 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">{t("allFormats") || "All formats"}</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSource("all");
                    setFilterFormat("all");
                  }}
                  className="h-12 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  {t("clear")}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("recentExports")}</h2>
              </div>
              <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: "visible" }}>
                <table className="w-full border-collapse text-sm text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Scope</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide">Format</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide">Created</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wide">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                          {t("loading")}
                        </td>
                      </tr>
                    ) : exports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
                              <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="space-y-1">
                              <p className="text-base font-semibold text-white">{t("noExportsYet")}</p>
                              <p className="text-sm text-slate-400">{t("createYourFirstDataExport")}</p>
                            </div>
                            <button
                              onClick={() => setShowExportModal(true)}
                              className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              {t("createFirstExport")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      exports.map((exp) => (
                        <tr key={exp.id} className="border-b border-slate-900/50 hover:bg-slate-900/30">
                          <td className="px-6 py-3">
                            <p className="text-sm font-medium text-white">{exp.downloadKey || `export-${exp.id}`}</p>
                            <p className="text-xs text-slate-500">{formatBytes(exp.fileSize)}</p>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-400">{exp.scopeLabel}</td>
                          <td className="px-6 py-3 text-xs text-slate-400 uppercase">{exp.format}</td>
                          <td className="px-6 py-3 text-right text-xs text-slate-400">
                            {new Date(exp.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center justify-center gap-2">
                              {exp.downloadUrl ? (
                                <a
                                  href={`/api/exports/${exp.id}/download`}
                                  className="rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20"
                                >
                                  {t("download") || "Download"}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                              <button
                                onClick={() => deleteExport(exp.id)}
                                disabled={deletingId === exp.id}
                                className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingId === exp.id ? t("deleting") || "Deleting..." : t("delete") || "Delete"}
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

            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("integrations")}</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-xs text-slate-400">
                  <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                    {t("integrationsRoadmap") ||
                      "Integrations with external systems are on the roadmap. For now, use exports above to download data and import it elsewhere."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportSuccess={() => {
          void loadExports();
        }}
      />
    </>
  );
}
