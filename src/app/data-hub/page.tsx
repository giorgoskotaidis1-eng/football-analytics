"use client";

import { useState } from "react";
import { ExportModal } from "../components/ExportModal";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

export default function DataHubPage() {
  const { t } = useTranslation();
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Professional Header */}
        <header className="border-b border-slate-200 dark:border-slate-900/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">{t("tools")}</p>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t("exports")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("exportsDescription")}
                </p>
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

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters Panel */}
          <div className="mb-6 rounded-xl border border-slate-200/80 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/30 via-slate-50/30 dark:via-slate-950/30 to-white dark:to-slate-950/30 p-6 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Source
                  </label>
                  <div className="relative">
                    <select className="h-12 w-48 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700">
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All sources</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Match events</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Squad metrics</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Format
                  </label>
                  <div className="relative">
                    <select className="h-12 w-48 appearance-none rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 dark:hover:border-slate-700">
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All formats</option>
                      <option className="bg-slate-900 text-white">CSV</option>
                      <option className="bg-slate-900 text-white">JSON</option>
                      <option className="bg-slate-900 text-white">PDF</option>
                      <option className="bg-slate-900 text-white">Excel</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout: Recent Exports + Integrations */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Recent Exports Section */}
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("recentExports")}</h2>
              </div>
              <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
                <table className="w-full border-collapse text-sm text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Name</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Scope</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Format</span>
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-semibold uppercase tracking-wide">Created</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
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
                  </tbody>
                </table>
              </div>
            </div>

            {/* Integrations Section */}
            <div className="rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/50 to-slate-950/50 shadow-xl">
              <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-800/50 bg-slate-900/30">
                <h2 className="text-base font-bold text-white">{t("integrations")}</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800/50 border border-slate-700">
                    <svg className="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-slate-300">{t("noIntegrationsConfigured")}</p>
                    <p className="text-xs text-slate-500">
                      {t("externalIntegrationsWillBeAvailable")}
                    </p>
                  </div>
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
          // Refresh page or update export list
          window.location.reload();
        }}
      />
    </>
  );
}
