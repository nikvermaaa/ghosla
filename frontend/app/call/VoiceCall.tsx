"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8000";

type Stage = "idle" | "calling" | "analyzing";
type SessionData = Record<string, string>;

// ── Hardcoded session — form submit or fallback ────────────────────────────────
const HARDCODED_SESSION: SessionData = {
  name: "Mohammed Mursaleen",
  age: "28",
  gender: "male",
  locality: "Electronic City",
  suggested_locality_choice: "Electronic City Phase 1 or Phase 2",
  budget_range: "20000-25000",
  bhk_type: "2 BHK",
  furnishing_type: "fully-furnished",
  lifestyle_preference: "active healthy fitness-focused",
  workplace_location: "Electronic City",
  max_commute_time: "30 minutes",
  amenities_required: "gym swimming pool jogging track",
  deal_breakers: "high AQI no gym far from office",
  priorities: "gym access low AQI short commute to Electronic City",
  user_type: "working professional",
  living_type: "bachelor",
  primary_priority: "health and fitness infrastructure",
  nearby_requirements: "gym hospital pharmacy supermarket",
  occupancy_type: "single",
  kids: "no",
  has_locality: "yes",
};

const PLATFORMS = [
  { name: "NoBroker", logo: "/nobroker.png", color: "#e11d48" },
  { name: "MagicBricks", logo: "/magicbricks.png", color: "#7c3aed" },
  { name: "99acres", logo: "/99acres.png", color: "#2563eb" },
];

const WAVE_HEIGHTS = Array.from(
  { length: 28 },
  () => Math.floor(Math.random() * 34) + 8,
);

const SCRAPING_LINES = [
  "Finding homes that actually match your vibe…",
  "Scanning trusted listings across top platforms…",
  "Filtering noise, highlighting real options…",
  "Matching commute, budget, and lifestyle signals…",
  "Shortlisting homes worth your time…",
];

const lightBg: React.CSSProperties = {
  backgroundColor: "#e2ded7",
  backgroundImage: [
    "radial-gradient(ellipse 70% 55% at 0% 0%, rgba(214,166,63,0.20) 0%, transparent 55%)",
    "radial-gradient(ellipse 60% 50% at 100% 100%, rgba(214,166,63,0.14) 0%, transparent 55%)",
    "radial-gradient(rgba(26,23,20,0.10) 1.2px, transparent 1.2px)",
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 24px 24px",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(26,23,20,0.13)",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 14,
  color: "#1a1714",
  outline: "none",
  transition: "border-color 0.15s",
  fontFamily: "inherit",
};

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function VoiceCall() {
  const [stage, setStage] = useState<Stage>("idle");
  const [session, setSession] = useState<SessionData>(HARDCODED_SESSION);
  const [callingPhone, setCallingPhone] = useState("");
  const [skipPost, setSkipPost] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-screen text-[#1a1714]" style={lightBg}>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b backdrop-blur-md"
        style={{
          backgroundColor: "rgba(226,222,215,0.92)",
          borderColor: "rgba(26,23,20,0.1)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            background: "linear-gradient(120deg, #d6a63f, #f4cf77)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          className="font-bold text-lg tracking-tight"
        >
          Ghosla
        </span>
        <a
          href="/"
          className="text-sm text-[#6b635a] hover:text-[#1a1714] transition-colors underline underline-offset-4"
          style={{ textDecorationColor: "rgba(26,23,20,0.2)" }}
        >
          ← Back
        </a>
      </header>

      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <IdleView
            key="idle"
            onCallRequest={(phone) => {
              setCallingPhone(phone);
              setSkipPost(true);
              setStage("calling");
            }}
            onFormSubmit={(data) => {
              setSession(data);
              setSkipPost(false);
              setStage("analyzing");
            }}
          />
        )}
        {stage === "calling" && (
          <CallingView
            key="calling"
            phone={callingPhone}
            onComplete={() => setStage("analyzing")}
          />
        )}
        {stage === "analyzing" && (
          <AnalyzingView
            key="analyzing"
            session={session}
            skipPost={skipPost}
            onDone={() => router.push("/results")}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

// ── Idle view ─────────────────────────────────────────────────────────────────

function IdleView({
  onCallRequest,
  onFormSubmit,
}: {
  onCallRequest: (phone: string) => void;
  onFormSubmit: (data: SessionData) => void;
}) {
  const [phone, setPhone] = useState("");
  const [callError, setCallError] = useState("");
  const [calling, setCalling] = useState(false);

  const [form, setForm] = useState({
    name: "", locality: "", workplace: "",
    budgetMin: "", budgetMax: "",
    bhk: "", furnishing: "", lifestyle: "",
    amenities: "", dealBreakers: "", commute: "",
  });

  const set =
    (k: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const focusStyle = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => (e.target.style.borderColor = "#d6a63f");
  const blurStyle = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => (e.target.style.borderColor = "rgba(26,23,20,0.13)");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 10
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
    setCallError("");
  };

  const handleCallRequest = async () => {
    if (phone.length < 10) {
      setCallError("Enter a valid 10-digit number");
      return;
    }
    setCalling(true);
    setCallError("");
    const fullPhone = `+91${phone}`;
    try {
      const resp = await fetch(`${BACKEND_URL}/call/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? "Call initiation failed");
      }
      onCallRequest(fullPhone);
    } catch (err) {
      setCallError(err instanceof Error ? err.message : "Could not place call. Try again.");
      setCalling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session: SessionData = {
      ...HARDCODED_SESSION,
      name: form.name || HARDCODED_SESSION.name,
      locality: form.locality || HARDCODED_SESSION.locality,
      workplace_location:
        form.workplace || HARDCODED_SESSION.workplace_location,
      budget_range:
        form.budgetMin && form.budgetMax
          ? `${form.budgetMin}-${form.budgetMax}`
          : HARDCODED_SESSION.budget_range,
      bhk_type: form.bhk ? `${form.bhk} BHK` : HARDCODED_SESSION.bhk_type,
      furnishing_type: form.furnishing || HARDCODED_SESSION.furnishing_type,
      lifestyle_preference:
        form.lifestyle || HARDCODED_SESSION.lifestyle_preference,
      amenities_required:
        form.amenities || HARDCODED_SESSION.amenities_required,
      deal_breakers: form.dealBreakers || HARDCODED_SESSION.deal_breakers,
      max_commute_time: form.commute || HARDCODED_SESSION.max_commute_time,
    };
    onFormSubmit(session);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg mx-auto px-6 pt-32 pb-20 space-y-12"
    >
      {/* ── Phone call section ── */}
      <div className="space-y-5">
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.86)",
            border: "1px solid rgba(26,23,20,0.14)",
          }}
        >
          <div className="text-center space-y-1.5 pb-1">
            <p
              style={{ fontFamily: "var(--font-serif)" }}
              className="italic text-[#9b6d0a] text-2xl"
            >
              Talk to Sara
            </p>
            <p
              style={{ fontFamily: "var(--font-display)" }}
              className="font-bold text-2xl tracking-tight text-[#1a1714]"
            >
              Get a call from our AI agent
            </p>
            <p className="text-base text-[#4f4a44] leading-relaxed">
              Sara will ask you 6 quick questions — takes about 2 minutes.
            </p>
          </div>

          {/* Phone input */}
          <div className="flex items-stretch gap-2">
            <div
              className="flex items-center gap-2 px-4 rounded-xl shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(26,23,20,0.13)",
              }}
            >
              <span className="text-base">🇮🇳</span>
              <span className="text-sm font-semibold text-[#6b635a]">+91</span>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={phone}
              onChange={handlePhoneChange}
              style={{
                ...inputBase,
                letterSpacing: "0.06em",
                fontSize: 16,
              }}
            />
          </div>

          {callError && (
            <p className="text-xs text-red-500 font-semibold">{callError}</p>
          )}

          <motion.button
            type="button"
            onClick={handleCallRequest}
            disabled={calling || phone.length < 10}
            whileHover={phone.length >= 10 ? { scale: 1.01 } : {}}
            whileTap={phone.length >= 10 ? { scale: 0.98 } : {}}
            className="w-full py-4 rounded-xl font-bold text-sm transition-opacity disabled:opacity-40"
            style={{
              background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)",
              color: "#1a1714",
              boxShadow: "0 8px 28px -8px rgba(214,166,63,0.55)",
            }}
          >
            {calling ? "Placing call…" : "Get a call from Sara →"}
          </motion.button>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-4">
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: "rgba(26,23,20,0.13)" }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-[0.22em]"
          style={{ color: "#9ca3af" }}
        >
          or fill the form
        </span>
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: "rgba(26,23,20,0.13)" }}
        />
      </div>

      {/* ── Form ── */}
      <div className="space-y-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Locality */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                Your name
              </label>
              <input
                type="text"
                placeholder="e.g. Priya"
                value={form.name}
                onChange={set("name")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                Area / locality
              </label>
              <input
                type="text"
                placeholder="e.g. Electronic City"
                value={form.locality}
                onChange={set("locality")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Workplace */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
              Workplace location
            </label>
            <input
              type="text"
              placeholder="e.g. Whitefield, Electronic City Phase 1"
              value={form.workplace}
              onChange={set("workplace")}
              style={inputBase}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Budget */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
              Monthly budget (₹)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Min — e.g. 15000"
                value={form.budgetMin}
                onChange={set("budgetMin")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
              <input
                type="number"
                placeholder="Max — e.g. 30000"
                value={form.budgetMax}
                onChange={set("budgetMax")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* BHK + Furnishing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                BHK
              </label>
              <select
                value={form.bhk}
                onChange={set("bhk")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">Any</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                Furnishing
              </label>
              <select
                value={form.furnishing}
                onChange={set("furnishing")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">Any</option>
                <option value="fully-furnished">Fully furnished</option>
                <option value="semi-furnished">Semi-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>

          {/* Lifestyle + Commute */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                Lifestyle
              </label>
              <select
                value={form.lifestyle}
                onChange={set("lifestyle")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">Any</option>
                <option value="active healthy fitness-focused">
                  Active & fitness
                </option>
                <option value="peaceful quiet">Peaceful & quiet</option>
                <option value="premium luxury">Premium</option>
                <option value="balanced community">Balanced</option>
                <option value="vibrant social">Vibrant & social</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
                Max commute
              </label>
              <select
                value={form.commute}
                onChange={set("commute")}
                style={inputBase}
                onFocus={focusStyle}
                onBlur={blurStyle}
              >
                <option value="">Any</option>
                <option value="15 minutes">15 min</option>
                <option value="30 minutes">30 min</option>
                <option value="45 minutes">45 min</option>
                <option value="60 minutes">1 hour</option>
              </select>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
              Must-have amenities
            </label>
            <input
              type="text"
              placeholder="e.g. gym, pool, parking, lift"
              value={form.amenities}
              onChange={set("amenities")}
              style={inputBase}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Deal-breakers */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#6b635a]">
              Deal-breakers
            </label>
            <input
              type="text"
              placeholder="e.g. high AQI, no gym, far from metro"
              value={form.dealBreakers}
              onChange={set("dealBreakers")}
              style={inputBase}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-xl font-bold text-sm transition-colors"
            style={{
              background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)",
              color: "#1a1714",
              boxShadow: "0 8px 28px -8px rgba(214,166,63,0.55)",
            }}
          >
            Find my home →
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}

// ── Calling view ──────────────────────────────────────────────────────────────

function CallingView({
  phone,
  onComplete,
}: {
  phone: string;
  onComplete: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [callStatus, setCallStatus] = useState<string>("calling");
  const doneRef = useRef(false);
  const idleStreakRef = useRef(0);

  const statusLabel = {
    calling: "Calling you…",
    on_call: "You're talking to Sara",
    processing: "Extracting your requirements…",
    complete: "Done! Loading results…",
    failed: "Processing your search…",
    idle: "Connecting your call…",
  }[callStatus] ?? "Calling you…";

  const statusSub = {
    calling: "Keep your phone nearby — Sara will call in a moment.",
    on_call: "Sara will ask you 6 quick questions about your ideal home.",
    processing: "Sara finished the call — analysing what you need.",
    complete: "Handing off to our AI research engine.",
    failed: "Using your preferences to search for the best homes.",
    idle: "Starting the voice session and preparing your search.",
  }[callStatus] ?? "";

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    const poll = setInterval(async () => {
      try {
        const resp = await fetch(`${BACKEND_URL}/call/status`);
        const data = (await resp.json().catch(() => ({}))) as { status?: string };
        const status = data.status ?? "calling";
        setCallStatus(status);

        if (status === "idle") {
          idleStreakRef.current += 1;
          if (idleStreakRef.current >= 3 && !doneRef.current) {
            doneRef.current = true;
            setCallStatus("failed");
            setTimeout(() => onComplete(), 1200);
            return;
          }
        } else {
          idleStreakRef.current = 0;
        }

        if (
          (status === "complete" || status === "failed") &&
          !doneRef.current
        ) {
          doneRef.current = true;
          // Small pause so the user sees the status before transitioning
          setTimeout(() => onComplete(), 1200);
        }
      } catch {}
    }, 2000);

    const hardTimeout = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        setCallStatus("failed");
        onComplete();
      }
    }, 180000);

    return () => {
      clearInterval(timer);
      clearInterval(poll);
      clearTimeout(hardTimeout);
    };
  }, [onComplete]);

  const isOnCall = callStatus === "on_call";
  const isDone = callStatus === "complete" || callStatus === "failed";
  const isProcessing = callStatus === "processing";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center min-h-screen gap-10 text-center px-6"
    >
      <p
        style={{ fontFamily: "var(--font-display)" }}
        className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a63f]"
      >
        Ghosla
      </p>

      <div className="space-y-2">
        <h2
          style={{ fontFamily: "var(--font-display)" }}
          className="text-3xl font-bold tracking-tight"
        >
          {statusLabel}
        </h2>
        <p className="text-sm text-[#6b635a] max-w-xs leading-relaxed">
          {statusSub}
        </p>
      </div>

      {/* Phone number pill */}
      <div
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
        style={{
          backgroundColor: "rgba(255,255,255,0.72)",
          border: "1px solid rgba(26,23,20,0.10)",
        }}
      >
        <span>📞</span>
        <span className="text-[#1a1714]">{phone}</span>
      </div>

      {/* Animation */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings — only when ringing or on call */}
        {!isDone && !isProcessing && (
          <>
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 220,
                height: 220,
                backgroundColor: isOnCall
                  ? "rgba(16,185,129,0.10)"
                  : "rgba(214,166,63,0.12)",
              }}
              animate={{ scale: [1, 1.45, 1], opacity: [0.8, 0, 0.8] }}
              transition={{
                duration: 2.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 220,
                height: 220,
                backgroundColor: isOnCall
                  ? "rgba(16,185,129,0.14)"
                  : "rgba(214,166,63,0.16)",
              }}
              animate={{ scale: [1, 1.22, 1], opacity: [0.7, 0, 0.7] }}
              transition={{
                duration: 2.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: 0.55,
              }}
            />
          </>
        )}

        {/* Central circle */}
        <motion.div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 120,
            height: 120,
            background: isDone
              ? "linear-gradient(135deg, #10b981 0%, #34d399 100%)"
              : isProcessing
              ? "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)"
              : "linear-gradient(135deg, #d6a63f 0%, #f4cf77 100%)",
            boxShadow: isDone
              ? "0 20px 56px -12px rgba(16,185,129,0.55)"
              : isProcessing
              ? "0 20px 56px -12px rgba(99,102,241,0.50)"
              : "0 20px 56px -12px rgba(214,166,63,0.60)",
          }}
          animate={
            isOnCall
              ? { scale: [1, 1.06, 1] }
              : {}
          }
          transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {isDone ? (
            <span className="text-white text-3xl">✓</span>
          ) : isProcessing ? (
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          ) : (
            <PhoneIcon size={44} color="#1a1714" />
          )}
        </motion.div>
      </div>

      {/* Wave bars — shown while on call */}
      {isOnCall && (
        <div className="flex items-center gap-[3px]" style={{ height: 52 }}>
          {WAVE_HEIGHTS.map((h, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{ width: 3, backgroundColor: "#d6a63f" }}
              animate={{ height: [4, h, 4] }}
              transition={{
                duration: 0.65 + i * 0.015,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.04,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Timer */}
      <p className="font-mono text-sm text-[#6b635a] tracking-widest">
        {formatTime(elapsed)}
      </p>

      <p className="text-xs text-[#9ca3af] max-w-xs">
        {isProcessing || isDone
          ? "Our AI is reading your preferences and finding matches."
          : "Do not close this page — you'll see your results after the call."}
      </p>
    </motion.div>
  );
}

// ── Analyzing view ─────────────────────────────────────────────────────────────

function AnalyzingView({
  session,
  skipPost,
  onDone,
}: {
  session: SessionData;
  skipPost: boolean;
  onDone: () => void;
}) {
  const [logs, setLogs] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [aiDone, setAiDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Only POST session if not coming from the voice call flow
    // (outbound.py already POSTed session/complete after the call)
    if (!skipPost) {
      fetch(`${BACKEND_URL}/session/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      }).catch(() => {});
    }

    // Timer
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    // Poll results — navigate as soon as source === "ai"
    const resultsInterval = setInterval(async () => {
      try {
        const data = (await fetch(`${BACKEND_URL}/results`).then((r) =>
          r.json(),
        )) as { source?: string };
        if (data.source === "ai" && !doneRef.current) {
          doneRef.current = true;
          setAiDone(true);
          setTimeout(() => onDone(), 1200);
        }
      } catch {}
    }, 4000);

    // Scan status fallback
    const statusInterval = setInterval(async () => {
      try {
        const { status } = (await fetch(`${BACKEND_URL}/scan/status`).then(
          (r) => r.json(),
        )) as { status: string };
        if (status === "complete" && !doneRef.current) {
          doneRef.current = true;
          setAiDone(true);
          setTimeout(() => onDone(), 1500);
        }
      } catch {}
    }, 3000);

    // Poll logs
    const logInterval = setInterval(async () => {
      try {
        const { logs: incoming } = (await fetch(
          `${BACKEND_URL}/scan/logs`,
        ).then((r) => r.json())) as { logs: string[] };
        if (Array.isArray(incoming)) setLogs(incoming);
      } catch {}
    }, 1500);

    const hardTimeout = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, 240000);

    return () => {
      clearInterval(timer);
      clearInterval(resultsInterval);
      clearInterval(statusInterval);
      clearInterval(logInterval);
      clearTimeout(hardTimeout);
    };
  }, [onDone, session, skipPost]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-2xl mx-auto px-6 pt-28 pb-20 space-y-10"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <p
          style={{ fontFamily: "var(--font-display)" }}
          className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a63f]"
        >
          Ghosla
        </p>
        <h2
          style={{ fontFamily: "var(--font-display)" }}
          className="text-3xl font-bold tracking-tight"
        >
          {aiDone ? "Found your matches!" : "Searching for your home…"}
        </h2>
        <p className="text-sm text-[#6b635a]">
          {aiDone
            ? "Preparing your results"
            : "Scanning 3 platforms + AI research simultaneously"}
        </p>
      </div>

      <RotatingScrapeShowcase elapsed={elapsed} aiDone={aiDone} />

      {/* Live log feed */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "rgba(26,23,20,0.04)",
          border: "1px solid rgba(26,23,20,0.10)",
        }}
      >
        <div
          className="px-4 py-2.5 border-b text-[10px] font-bold uppercase tracking-wider text-[#9ca3af] flex items-center gap-2"
          style={{ borderColor: "rgba(26,23,20,0.08)" }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: aiDone ? "#10b981" : "#d6a63f" }}
            animate={aiDone ? {} : { opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
          />
          Live activity
        </div>
        <div className="p-4 max-h-44 overflow-y-auto font-mono text-xs space-y-0.5">
          {logs.length > 0 ? (
            logs.map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className={`leading-relaxed py-0.5 ${logColor(line)}`}
              >
                {line}
              </motion.p>
            ))
          ) : (
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
              className="text-[#d6a63f]"
            >
              Initialising engines…
            </motion.span>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      <p className="text-center text-xs text-[#9ca3af]">
        Sit back — we&apos;re lining up your best options.
      </p>
    </motion.div>
  );
}

// ── Rotating scrape showcase ───────────────────────────────────────────────────

function RotatingScrapeShowcase({
  elapsed,
  aiDone,
}: {
  elapsed: number;
  aiDone: boolean;
}) {
  const activeIndex = aiDone ? PLATFORMS.length - 1 : Math.floor(elapsed / 4) % PLATFORMS.length;
  const active = PLATFORMS[activeIndex];
  const creativeText = aiDone
    ? "Perfect — your personalized shortlist is ready."
    : SCRAPING_LINES[Math.floor(elapsed / 5) % SCRAPING_LINES.length];

  return (
    <div
      className="rounded-2xl p-6 text-center space-y-5 relative overflow-hidden"
      style={{
        backgroundColor: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(26,23,20,0.12)",
      }}
    >
      <motion.div
        className="absolute -top-10 -right-8 w-28 h-28 rounded-full"
        style={{ backgroundColor: "rgba(214,166,63,0.14)" }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-14 -left-10 w-32 h-32 rounded-full"
        style={{ backgroundColor: "rgba(214,166,63,0.12)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.15, 0.45] }}
        transition={{ duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="relative h-52 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.name}
            initial={{ opacity: 0, scale: 0.88, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.08, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              className="w-36 h-36 rounded-3xl flex items-center justify-center"
              style={{
                backgroundColor: `${active.color}18`,
                border: `1px solid ${active.color}44`,
                boxShadow: `0 10px 30px ${active.color}30`,
              }}
              animate={aiDone ? {} : { rotate: [0, 1.2, -1.2, 0], scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.logo} alt={active.name} className="w-24 h-24 object-contain" />
            </motion.div>
            <motion.p
              className="text-sm font-bold"
              style={{ color: active.color }}
              animate={aiDone ? {} : { opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            >
              Scraping {active.name}…
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-2">
        {PLATFORMS.map((platform, i) => (
          <motion.span
            key={platform.name}
            className="h-1.5 rounded-full"
            style={{
              width: i === activeIndex ? 30 : 10,
              backgroundColor: i === activeIndex ? platform.color : "rgba(26,23,20,0.16)",
            }}
            animate={i === activeIndex && !aiDone ? { opacity: [0.55, 1, 0.55] } : {}}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
          />
        ))}
      </div>

      <p className="text-sm text-[#5a544d] leading-relaxed">{creativeText}</p>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function logColor(line: string): string {
  if (line.includes("[NoBroker]")) return "text-rose-600";
  if (line.includes("[99Acres]") || line.includes("[99acres]"))
    return "text-blue-600";
  if (line.includes("[MagicBricks]")) return "text-violet-600";
  if (line.includes("[Runner]")) return "text-[#d6a63f]";
  if (line.includes("[Research]")) return "text-purple-600";
  return "text-[#6b635a]";
}

function PhoneIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.36 2 2 0 0 1 3.61 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.09a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
