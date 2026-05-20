"use client";
import dynamic from "next/dynamic";

const VoiceCall = dynamic(() => import("./VoiceCall"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-[#e2ded7] text-[#1a1714]">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b635a]">Loading…</p>
    </main>
  ),
});

export default function CallPage() {
  return <VoiceCall />;
}
