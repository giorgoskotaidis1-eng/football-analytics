"use client";

export default function SupportPage() {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] text-xs text-slate-200">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Help center</p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-50">Support & feedback</h1>
          <p className="text-[11px] text-slate-500">
            Find answers to common questions or send us details about an issue you&apos;re facing.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] font-medium text-slate-300">Popular topics</p>
          <ul className="space-y-2 text-[11px] text-slate-400">
            <li>• How to upload and tag a new match.</li>
            <li>• Inviting staff and assigning roles.</li>
            <li>• Exporting match data to CSV or API.</li>
            <li>• Managing subscription and invoices.</li>
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="text-[11px] font-medium text-slate-300">Report an issue</p>
          <form className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Subject</label>
              <input
                className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                placeholder="Short summary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Details</label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60"
                placeholder="Describe what happened, steps to reproduce and any error messages."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Priority</label>
              <select className="h-8 w-full rounded-md border border-slate-800 bg-slate-900 px-2 text-[11px] text-slate-100 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60">
                <option>Normal</option>
                <option>High</option>
                <option>Critical (production)</option>
              </select>
            </div>
            <button className="h-8 w-full rounded-md bg-emerald-500 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">
              Submit ticket
            </button>
          </form>
        </div>
      </div>

      <aside className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
        <p className="font-medium">Live support</p>
        <p className="text-slate-500">
          Our team is online during match weekends and normal business hours. Start a chat for quick assistance.
        </p>
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <p className="text-[11px] text-slate-200">Chat placeholder</p>
          <p className="text-[10px] text-slate-500">
            A live chat widget from your provider (e.g. Intercom) will appear here in production.
          </p>
        </div>
        <p className="font-medium">Status</p>
        <p className="text-[10px] text-slate-500">All systems operational. No incidents reported.</p>
      </aside>
    </div>
  );
}
