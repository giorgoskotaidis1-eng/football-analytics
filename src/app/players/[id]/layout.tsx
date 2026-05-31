"use client";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1f2f] via-[#0f1923] to-[#0c1f2f]">
      {/* Player Content - No header, no sidebar, full width */}
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}

