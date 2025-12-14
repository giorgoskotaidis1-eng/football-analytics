"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export function FileUploadModal({ isOpen, onClose, onUploadSuccess }: FileUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("report");

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", fileType);
      formData.append("name", fileName || file.name);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("File uploaded successfully!");
        onUploadSuccess?.();
        onClose();
        // Reset form
        setFileName("");
        setFileType("report");
        if (fileInput) fileInput.value = "";
      } else {
        toast.error(data.message || "Failed to upload file");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 text-xs text-slate-200 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 transition text-xl font-bold leading-none"
        >
          ×
        </button>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Upload File</h2>
          <p className="text-[11px] text-slate-400 mt-1">
            Upload documents, reports, or other files to your library.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">File</label>
            <input
              id="file-input"
              type="file"
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 file:mr-4 file:rounded file:border-0 file:bg-emerald-500 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-slate-950"
              required
            />
            <p className="text-[10px] text-slate-500">Max 50MB. PDF, DOCX, XLSX, CSV supported.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">File Name (Optional)</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
              placeholder="Custom name for the file"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-300">Type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
            >
              <option value="report">Report</option>
              <option value="schedule">Schedule</option>
              <option value="data">Data</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 rounded-md border border-slate-700 bg-slate-900 text-[11px] font-semibold text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 h-9 rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {uploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

