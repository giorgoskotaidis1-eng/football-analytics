"use client";

import { useState } from "react";
import Link from "next/link";
import { FileUploadModal } from "../components/FileUploadModal";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n";

export default function FileManagerPage() {
  const { t } = useTranslation();
  const [showUploadModal, setShowUploadModal] = useState(false);

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
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{t("documents")}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t("documentsDescription")}
                </p>
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

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
          {/* Filters Panel */}
          <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("filter")}
                  </label>
                  <div className="relative">
                    <select className="h-12 w-48 appearance-none rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-700">
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("allTypes")}</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("report")}</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("schedule")}</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("data")}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("sortBy")}
                  </label>
                  <div className="relative">
                    <select className="h-12 w-48 appearance-none rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-700">
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("lastModified")}</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("name")}</option>
                      <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t("size")}</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {t("search")}
                  </label>
                  <div className="relative">
                    <input
                      className="h-12 w-64 rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 px-4 pr-10 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 outline-none transition-all focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-400 dark:hover:border-slate-700"
                      placeholder={t("searchFiles")}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Files Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800/50 bg-gradient-to-br from-white dark:from-slate-900/50 via-slate-50 dark:via-slate-950/50 to-white dark:to-slate-950/50 overflow-hidden shadow-xl">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/30">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t("documentList")}</h2>
            </div>
            <div className="overflow-x-auto hide-scrollbar" style={{ overflowY: 'visible' }}>
              <table className="w-full border-collapse text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("name")}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("filter")}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("size")}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("lastModified")}</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide">{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700">
                          <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-900 dark:text-white">{t("noDocumentsYet")}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{t("uploadFirstDocument")}</p>
                        </div>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-500 hover:scale-105"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t("uploadFirstDocumentButton")}
                        </button>
                      </div>
                    </td>
                  </tr>
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
          // Refresh page or update file list
          window.location.reload();
        }}
      />
    </>
  );
}
