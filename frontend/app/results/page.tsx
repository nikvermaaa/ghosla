"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8000";

const PLATFORM_LOGOS: Record<string, string> = {
  NoBroker: "/nobroker.png",
  "99acres": "/99acres.png",
  MagicBricks: "/magicbricks.png",
};

const PLATFORM_COLORS: Record<string, string> = {
  NoBroker: "#e11d48",
  "99acres": "#2563eb",
  MagicBricks: "#7c3aed",
};

const FALLBACK_LISTING_IMAGES = [
  "/fallback/2bhk1.png",
  "/fallback/2bhk2.png",
  "/fallback/2bhk3.png",
  "/fallback/2bhk4.png",
  "/fallback/2bhk5.png",
  "/fallback/2bhk6.png",
  "/fallback/2bhk1.png",
  "/fallback/2bhk2.png",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalityIntel {
  overall_rating?: unknown;
  aqi?: unknown;
  noise_db?: unknown;
  noise?: unknown;
  traffic_delay?: unknown;
  traffic?: unknown;
  water_supply?: unknown;
  internet?: unknown;
  power_backup?: unknown;
  safety?: unknown;
  pros?: unknown;
  red_flags?: unknown;
}

interface Owner {
  name: string;
  phone: string;
}

interface Listing {
  id: string;
  title: string;
  society?: string;
  address?: string;
  bhk?: string;
  area_sqft?: number;
  floor?: string;
  rent: number;
  maintenance?: number;
  deposit?: number;
  furnishing?: string;
  platform: string;
  match_score: number;
  fraud_score?: number;
  vibe_score?: number;
  image_url?: string;
  tags?: string[];
  owner?: Owner;
  locality_intel?: LocalityIntel;
}

type SortKey = "match" | "vibe" | "trust" | "rent_asc" | "rent_desc";

// ── Helpers ────────────────────────────────────────────────────────────────────

interface NormalizedLocalityIntel {
  overall_rating?: number;
  aqi?: number;
  aqi_level?: string;
  pm25?: number;
  pm10?: number;
  noise_db?: number;
  traffic_delay?: string;
  water_supply?: string;
  internet?: string;
  power_backup?: string;
  safety?: string;
  pros: string[];
  red_flags: string[];
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [
      obj.value,
      obj.overall_rating,
      obj.level_db,
      obj.peak_delay,
      obj.score,
    ];
    for (const c of candidates) {
      const n = asNumber(c);
      if (n != null) return n;
    }
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const candidates = [obj.value, obj.level, obj.status, obj.peak_delay, obj.label];
    for (const c of candidates) {
      const text = asText(c);
      if (text) return text;
    }
  }
  return undefined;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = asText(value);
  return single ? [single] : [];
}

function normalizeLocalityIntel(raw?: LocalityIntel): NormalizedLocalityIntel | null {
  if (!raw) return null;

  const aqiObj = (raw.aqi && typeof raw.aqi === "object"
    ? (raw.aqi as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const noiseObj = (raw.noise && typeof raw.noise === "object"
    ? (raw.noise as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const trafficObj = (raw.traffic && typeof raw.traffic === "object"
    ? (raw.traffic as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const intel: NormalizedLocalityIntel = {
    overall_rating: asNumber(raw.overall_rating),
    aqi: asNumber(raw.aqi) ?? asNumber(aqiObj.value),
    aqi_level: asText(aqiObj.level),
    pm25: asNumber(aqiObj.pm25),
    pm10: asNumber(aqiObj.pm10),
    noise_db: asNumber(raw.noise_db) ?? asNumber(noiseObj.level_db) ?? asNumber(noiseObj.value),
    traffic_delay: asText(raw.traffic_delay) ?? asText(trafficObj.peak_delay) ?? asText(trafficObj.value),
    water_supply: asText(raw.water_supply),
    internet: asText(raw.internet),
    power_backup: asText(raw.power_backup),
    safety: asText(raw.safety),
    pros: asStringList(raw.pros),
    red_flags: asStringList(raw.red_flags),
  };

  const hasAnyData = Object.values(intel).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v != null && v !== "";
  });
  return hasAnyData ? intel : null;
}

function aqiColor(aqi: number): string {
  if (aqi < 50) return "#10b981";
  if (aqi < 100) return "#f59e0b";
  if (aqi < 150) return "#f97316";
  return "#ef4444";
}

function aqiLabel(aqi: number): string {
  if (aqi < 50) return "Good";
  if (aqi < 100) return "Moderate";
  if (aqi < 150) return "Sensitive";
  return "Unhealthy";
}

function scoreColor(score: number): string {
  if (score >= 75) return "#10b981";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({
  score,
  color,
  label,
  size = 52,
}: {
  score: number;
  color: string;
  label: string;
  size?: number;
}) {
  const strokeWidth = 4;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(score, 100) / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(26,23,20,0.14)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size < 58 ? 10 : 14, color: "#1a1714" }}
          >
            {score}
          </span>
        </div>
      </div>
      <span
        className="font-bold uppercase tracking-wider"
        style={{ fontSize: size < 58 ? 9 : 10, color: "rgba(26,23,20,0.62)" }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Score chip (card body) ─────────────────────────────────────────────────────

function ScoreChip({
  label,
  score,
  color,
  bg,
}: {
  label: string;
  score: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: bg, border: `1px solid ${color}30` }}
    >
      <span
        className="font-bold text-xs leading-none"
        style={{ color }}
      >
        {score}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: `${color}99` }}>
        {label}
      </span>
    </div>
  );
}

// ── Loading screen ─────────────────────────────────────────────────────────────

function LoadingScreen({ aiPending }: { aiPending?: boolean }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5" style={{ backgroundColor: "#f7f4ef" }}>
      <motion.div
        className="h-10 w-10 rounded-full"
        style={{ border: "2.5px solid #e8e3db", borderTopColor: "#d6a63f" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />
      {aiPending && (
        <p className="text-sm text-[#9ca3af]">
          AI is still researching — showing best available results soon…
        </p>
      )}
    </main>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("match");
  const [platformFilter, setPlatformFilter] = useState<string>("All");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetch(`${BACKEND_URL}/results`).then((r) => r.json()) as {
          source: string;
          results?: Listing[];
          listings?: Listing[];
        };
        setListings(data.results ?? data.listings ?? []);
        setSource(data.source ?? "");
        setLoading(false);

        // If not AI results yet, poll until they arrive
        if (data.source !== "ai") {
          pollRef.current = setInterval(async () => {
            try {
              const refresh = await fetch(`${BACKEND_URL}/results`).then((r) => r.json()) as {
                source: string;
                results?: Listing[];
                listings?: Listing[];
              };
              if (refresh.source === "ai") {
                setListings(refresh.results ?? refresh.listings ?? []);
                setSource("ai");
                if (pollRef.current) clearInterval(pollRef.current);
              }
            } catch {}
          }, 5000);
        }
      } catch {
        setLoading(false);
      }
    };

    void load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const platforms = ["All", ...Array.from(new Set(listings.map((l) => l.platform)))];

  const filtered = platformFilter === "All"
    ? listings
    : listings.filter((l) => l.platform === platformFilter);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "match") return (b.match_score ?? 0) - (a.match_score ?? 0);
    if (sort === "vibe") return (b.vibe_score ?? 0) - (a.vibe_score ?? 0);
    if (sort === "trust") return (a.fraud_score ?? 0) - (b.fraud_score ?? 0);
    if (sort === "rent_asc") return (a.rent ?? 0) - (b.rent ?? 0);
    if (sort === "rent_desc") return (b.rent ?? 0) - (a.rent ?? 0);
    return 0;
  });

  if (loading) return <LoadingScreen />;

  return (
    <main
      className="min-h-screen text-[#1a1714]"
      style={{
        backgroundColor: "#f7f4ef",
        backgroundImage: [
          "radial-gradient(ellipse 80% 45% at 10% 0%, rgba(214,166,63,0.10) 0%, transparent 60%)",
          "radial-gradient(ellipse 60% 40% at 90% 100%, rgba(214,166,63,0.07) 0%, transparent 55%)",
          "radial-gradient(rgba(26,23,20,0.045) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: "100% 100%, 100% 100%, 22px 22px",
      }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[#e8e3db] backdrop-blur-md" style={{ backgroundColor: "rgba(247,244,239,0.94)" }}>
        <div className="mx-auto max-w-6xl px-6 py-4 space-y-3">
          {/* Top row */}
          <div className="flex items-center justify-between">
            <div>
              <span
                style={{
                  fontFamily: "var(--font-display), sans-serif",
                  background: "linear-gradient(120deg, #d6a63f, #f4cf77)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                className="text-[10px] font-bold uppercase tracking-[0.24em] block mb-0.5"
              >
                Ghosla
              </span>
              <div className="flex items-center gap-2.5">
                <h1
                  style={{ fontFamily: "var(--font-display), sans-serif" }}
                  className="text-base font-bold tracking-tight"
                >
                  Your matches
                </h1>
                {source === "ai" && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    AI Results
                  </span>
                )}
                {source && source !== "ai" && (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    AI searching…
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/call"
              className="text-sm text-[#9ca3af] hover:text-[#1a1714] transition-colors underline underline-offset-4 decoration-[#e8e3db]"
            >
              ← New search
            </Link>
          </div>

          {/* Sort + filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#9ca3af] shrink-0">
              {filtered.length} homes
            </span>
            <div className="w-px h-3.5 bg-[#e8e3db]" />
            {(
              [
                { key: "match", label: "Best match" },
                { key: "vibe", label: "Best vibe" },
                { key: "trust", label: "Most trusted" },
                { key: "rent_asc", label: "Rent ↑" },
                { key: "rent_desc", label: "Rent ↓" },
              ] as { key: SortKey; label: string }[]
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  sort === s.key
                    ? "text-[#1a1714] border-transparent"
                    : "bg-white/70 text-[#6b635a] border-[#e8e3db] hover:border-[#d6a63f]/50"
                }`}
              style={sort === s.key ? { background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)" } : {}}
              >
                {s.label}
              </button>
            ))}
            {platforms.length > 2 && (
              <>
                <div className="w-px h-3.5 bg-[#e8e3db]" />
                {platforms.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatformFilter(p)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                      platformFilter === p
                        ? "text-[#1a1714] border-transparent"
                        : "bg-white/70 text-[#6b635a] border-[#e8e3db] hover:border-[#d6a63f]/50"
                    }`}
                    style={platformFilter === p ? { background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)" } : {}}
                  >
                    {p}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {sorted.length === 0 ? (
          <div className="py-32 text-center text-[#9ca3af]">
            No results found.{" "}
            <Link href="/call" className="text-[#d6a63f] underline underline-offset-2">
              Try a new search.
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((listing, i) => (
              <ListingCard
                key={listing.id ?? i}
                listing={listing}
                index={i}
                expanded={expanded === listing.id}
                onToggle={() => setExpanded(expanded === listing.id ? null : listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ── Listing card ───────────────────────────────────────────────────────────────

function ListingCard({
  listing,
  index,
  expanded,
  onToggle,
}: {
  listing: Listing;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trust = 100 - (listing.fraud_score ?? 20);
  const vibe = listing.vibe_score ?? 65;
  const platformColor = PLATFORM_COLORS[listing.platform] ?? "#6b635a";
  const platformLogo = PLATFORM_LOGOS[listing.platform];
  const intel = normalizeLocalityIntel(listing.locality_intel);
  const imageSrc = FALLBACK_LISTING_IMAGES[index % FALLBACK_LISTING_IMAGES.length];

  const imagePlaceholderStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${platformColor}22 0%, ${platformColor}10 100%)`,
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[#e8e0d4] overflow-hidden transition-shadow"
      style={{
        backgroundColor: "#fdfcf8",
        boxShadow: "0 2px 20px rgba(214,166,63,0.07), 0 1px 4px rgba(26,23,20,0.07)",
      }}
      whileHover={{ boxShadow: "0 8px 32px rgba(214,166,63,0.14), 0 2px 8px rgba(26,23,20,0.09)" }}
    >
      {/* Hero image */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={listing.title}
          className="w-full h-full object-cover"
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.08) 55%, transparent 100%)" }}
        />

        {/* Platform badge — top left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1.5">
          {platformLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={platformLogo} alt={listing.platform} className="h-4 w-auto object-contain" />
          ) : (
            <span className="text-[11px] font-bold" style={{ color: platformColor }}>{listing.platform}</span>
          )}
        </div>

        {/* Rent overlay — bottom left */}
        <div className="absolute bottom-3 left-3">
          <p
            style={{ fontFamily: "var(--font-display), sans-serif" }}
            className="text-white font-bold text-xl leading-none"
          >
            ₹{listing.rent?.toLocaleString("en-IN")}
            <span className="text-sm font-normal text-white/70">/mo</span>
          </p>
          {listing.deposit != null && (
            <p className="text-white/60 text-[11px] mt-0.5">
              ₹{listing.deposit.toLocaleString("en-IN")} deposit
            </p>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 space-y-4">
        {/* Score rings row */}
        <div
          className="rounded-xl border border-[#e8e0d4] p-3.5 flex items-center justify-around"
          style={{ backgroundColor: "#faf7f0" }}
        >
          <ScoreRing score={listing.match_score} color="#d6a63f" label="Match" size={68} />
          <ScoreRing score={vibe} color={scoreColor(vibe)} label="Vibe" size={68} />
          <ScoreRing score={trust} color={scoreColor(trust)} label="Trust" size={68} />
        </div>

        {/* Title */}
        <div>
          <h2
            style={{ fontFamily: "var(--font-display), sans-serif" }}
            className="font-bold text-[#1a1714] leading-snug tracking-tight text-base"
          >
            {listing.title}
          </h2>
          {listing.society && (
            <p className="text-sm text-[#6b635a] mt-0.5">{listing.society}</p>
          )}
          {listing.address && (
            <p className="text-xs text-[#9ca3af] mt-0.5 leading-snug">{listing.address}</p>
          )}
        </div>

        {/* Score chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <ScoreChip
            label="Match"
            score={listing.match_score}
            color="#c8901a"
            bg="#fef8e4"
          />
          <ScoreChip
            label="Vibe"
            score={vibe}
            color={scoreColor(vibe)}
            bg={`${scoreColor(vibe)}11`}
          />
          <ScoreChip
            label="Trust"
            score={trust}
            color={scoreColor(trust)}
            bg={`${scoreColor(trust)}11`}
          />
        </div>

        {/* Specs */}
        {(listing.bhk || listing.area_sqft || listing.floor || listing.furnishing) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b635a]">
            {listing.bhk && <span className="font-medium">{listing.bhk}</span>}
            {listing.area_sqft && <span>{listing.area_sqft} sqft</span>}
            {listing.floor && <span>Floor {listing.floor}</span>}
            {listing.furnishing && (
              <span className="capitalize">{listing.furnishing}</span>
            )}
            {listing.maintenance != null && (
              <span>+₹{listing.maintenance.toLocaleString("en-IN")} maint</span>
            )}
          </div>
        )}

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {listing.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#e8e0d4] px-2.5 py-0.5 text-[11px] text-[#6b635a]"
                style={{ backgroundColor: "#faf7f0" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Owner */}
        {listing.owner && (
          <div className="rounded-xl border border-[#e8e0d4] px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#faf7f0" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">Owner</p>
              <p className="text-sm font-semibold text-[#1a1714]">{listing.owner.name}</p>
            </div>
            <a
              href={`tel:${listing.owner.phone}`}
              className="px-4 py-2 rounded-full text-[#1a1714] text-xs font-bold transition-opacity hover:opacity-85"
              style={{ background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)" }}
            >
              Call
            </a>
          </div>
        )}

        {/* Listing advisor */}
        <div className="rounded-xl border border-[#e8e0d4] p-3.5 space-y-2" style={{ backgroundColor: "#faf7f0" }}>
          <button
            type="button"
            onClick={() => undefined}
            className="w-full px-4 py-2.5 rounded-full text-[#1a1714] text-xs font-bold transition-opacity hover:opacity-85"
            style={{ background: "linear-gradient(120deg, #d6a63f 0%, #f4cf77 100%)" }}
          >
            Talk to listing advisor
          </button>
        </div>

        {/* Locality intel toggle */}
        {intel && (
          <button
            type="button"
            onClick={onToggle}
            className="w-full text-left text-xs font-semibold text-[#9ca3af] hover:text-[#1a1714] transition-colors flex items-center gap-1.5"
          >
            <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
            {expanded ? "Hide neighbourhood intel" : "View neighbourhood intel"}
          </button>
        )}
      </div>

      {/* Locality intel panel */}
      <AnimatePresence>
        {expanded && intel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <LocalityPanel intel={intel} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ── Locality panel ─────────────────────────────────────────────────────────────

function LocalityPanel({ intel }: { intel: NormalizedLocalityIntel }) {
  const stats = [
    intel.noise_db != null ? { label: "Noise", value: `${intel.noise_db} dB` } : null,
    intel.traffic_delay ? { label: "Traffic", value: intel.traffic_delay } : null,
    intel.water_supply ? { label: "Water", value: intel.water_supply } : null,
    intel.internet ? { label: "Internet", value: intel.internet } : null,
    intel.power_backup ? { label: "Power backup", value: intel.power_backup } : null,
    intel.safety ? { label: "Safety", value: intel.safety } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="border-t border-[#e8e0d4] p-5 space-y-5 text-sm" style={{ backgroundColor: "#faf7f0" }}>
      {/* Rating row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9ca3af]">
          Locality Rating
        </span>
        {intel.overall_rating != null && (
          <span
            style={{ fontFamily: "var(--font-display), sans-serif" }}
            className="font-bold text-[#d6a63f]"
          >
            {intel.overall_rating} / 5
          </span>
        )}
      </div>

      {/* AQI — prominent */}
      {intel.aqi != null && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            backgroundColor: `${aqiColor(intel.aqi)}15`,
            border: `1px solid ${aqiColor(intel.aqi)}30`,
          }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: aqiColor(intel.aqi) }}>
              Air Quality (AQI)
            </p>
            <p className="text-lg font-bold text-[#1a1714]">{intel.aqi}</p>
            {(intel.pm25 != null || intel.pm10 != null) && (
              <p className="text-[11px] text-[#6b635a] mt-0.5">
                {intel.pm25 != null ? `PM2.5: ${intel.pm25}` : ""}{intel.pm25 != null && intel.pm10 != null ? " · " : ""}{intel.pm10 != null ? `PM10: ${intel.pm10}` : ""}
              </p>
            )}
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              color: aqiColor(intel.aqi),
              backgroundColor: `${aqiColor(intel.aqi)}18`,
            }}
          >
            {intel.aqi_level ?? aqiLabel(intel.aqi)}
          </span>
        </div>
      )}

      {/* Stats grid */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[#e8e0d4] px-3 py-2.5"
              style={{ backgroundColor: "#fdfcf8" }}
            >
              <p className="text-[#9ca3af] text-[10px] uppercase tracking-wide mb-0.5 font-semibold">
                {s.label}
              </p>
              <p className="font-semibold text-[#1a1714] text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pros */}
      {intel.pros && intel.pros.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Why you&apos;ll love it
          </p>
          <ul className="space-y-1.5">
            {intel.pros.map((p) => (
              <li key={p} className="flex gap-2 text-xs text-[#6b635a]">
                <span className="text-emerald-500 shrink-0 mt-px">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Red flags */}
      {intel.red_flags && intel.red_flags.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-red-500">
            Watch out for
          </p>
          <ul className="space-y-1.5">
            {intel.red_flags.map((f) => (
              <li key={f} className="flex gap-2 text-xs text-[#6b635a]">
                <span className="text-red-400 shrink-0 mt-px">⚠</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function HomeIcon({ size = 24, color = "#d6a63f" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
