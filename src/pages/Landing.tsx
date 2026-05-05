import { Link } from "react-router-dom";

const DEMO_MAILTO =
  "mailto:antonio.palma@megayours.com?subject=MegaYours%20Demo%20Request";

export default function Landing() {
  return (
    <div className="relative">
      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow animate-float-slow w-[520px] h-[520px] -top-40 -left-32 bg-stone-300/30" />
          <div className="ambient-glow animate-float-slow-reverse w-[480px] h-[480px] top-20 -right-32 bg-amber-200/25" />
          <div className="ambient-glow w-[640px] h-[640px] top-40 left-1/2 -translate-x-1/2 bg-orange-100/20" />
        </div>
        <div className="absolute inset-0 bg-grid mask-radial-top pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 lg:pt-24 pb-16">
          <div className="text-center max-w-3xl mx-auto animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.18em] uppercase px-3.5 py-1.5 rounded-full mb-7 shadow-sm shadow-stone-900/5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-pulse-dot" />
                <span className="relative bg-red-600 rounded-full w-1.5 h-1.5" />
              </span>
              Copyright Intelligence Layer
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-[-0.035em] leading-[1.05] text-stone-900 text-balance">
              The copyright intelligence layer for{" "}
              <span className="text-gradient-red">visual media.</span>
            </h1>
            <p className="mt-7 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed text-balance">
              MegaYours automates visual copyright compliance for legal teams
              and creators in the film and gaming industries.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              <a
                href={DEMO_MAILTO}
                className="group relative px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold overflow-hidden shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 hover:-translate-y-0.5 transition-all"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Request a demo
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </a>
              <a
                href="#how-it-works"
                className="px-6 py-3 border border-stone-300/80 bg-white/60 backdrop-blur text-stone-700 rounded-full text-sm font-semibold hover:bg-white hover:border-stone-400 transition-all"
              >
                Learn more
              </a>
            </div>

            {/* Trust ribbon */}
            <div className="mt-14 inline-flex items-baseline gap-3 bg-white/70 backdrop-blur-sm border border-stone-900/10 rounded-full px-5 py-2 shadow-sm shadow-stone-900/5">
              <span className="text-2xl font-black text-stone-900 tabular-nums tracking-tight">
                200K<span className="text-stone-400">+</span>
              </span>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-[0.18em]">
                Protected IPs indexed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Problem ================= */}
      <section className="relative border-t border-stone-200 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-40 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-stone-600" />
              The problem
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black text-stone-900 tracking-[-0.03em] leading-[1.05] text-balance">
              Visual content is exploding.{" "}
              <span className="text-stone-400">Copyright review is still manual.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <ProblemCard
              index="01"
              title="AI-generated media is increasing visual IP risk."
              description="More assets are produced faster than legal teams can review."
            />
            <ProblemCard
              index="02"
              title="Platforms cannot afford post-publication takedowns."
              description="Risk appears after listings, campaigns, UGC, or game assets are already live."
            />
            <ProblemCard
              index="03"
              title="General-purpose vision models are not built for copyright clearance."
              description="MegaYours is purpose-built for IP detection, similarity, and clearance workflows."
            />
          </div>
        </div>
      </section>

      {/* ================= Process (dark) ================= */}
      <section
        id="how-it-works"
        className="relative bg-stone-950 text-white scroll-mt-16 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow w-[600px] h-[600px] -top-40 -left-40 bg-red-600/15" />
          <div className="ambient-glow w-[500px] h-[500px] top-1/3 -right-40 bg-amber-500/10" />
        </div>
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-red-400" />
              How a clearance check runs
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
              Gather Evidence.{" "}
              <span className="text-gradient-cream">Reach a Verdict.</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto text-balance leading-relaxed">
              We surface the closest references, show why each was flagged, and
              hand your reviewer everything they need to make the call.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
            </div>

            {/* Phase 1 */}
            <div className="relative isolate bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 gradient-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-900/40">
                  1
                </div>
                <span className="text-[10px] font-semibold text-red-300/70 uppercase tracking-[0.2em]">
                  Phase One
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">
                Gather the Evidence
              </h3>
              <p className="text-sm text-white/50 mb-7 leading-relaxed">
                We analyze every asset across four independent dimensions, each
                surfacing a different kind of similarity to a protected reference.
              </p>
              <div className="space-y-3.5">
                <EvidenceRow
                  icon="eye"
                  title="Visual Likeness"
                  description="Distinctive shapes, layout, and silhouettes"
                />
                <EvidenceRow
                  icon="brain"
                  title="Concept & Style"
                  description="Same character or theme, even when redrawn or restyled"
                />
                <EvidenceRow
                  icon="scan"
                  title="Pixel by Pixel Comparison"
                  description="Side-by-side check against the canonical reference"
                />
                <EvidenceRow
                  icon="type"
                  title="Wordmarks & Text"
                  description="Brand names, titles, and typographic elements"
                />
              </div>
            </div>

            {/* Phase 2 */}
            <div className="relative isolate bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 gradient-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-900/40">
                  2
                </div>
                <span className="text-[10px] font-semibold text-red-300/70 uppercase tracking-[0.2em]">
                  Phase Two
                </span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">
                Reach a Verdict
              </h3>
              <p className="text-sm text-white/50 mb-7 leading-relaxed">
                We deliver supporting findings — not just a number. Every flag
                arrives with the reasoning and citations behind it.
              </p>
              <div className="space-y-4">
                <VerdictStep
                  title="Show the Evidence"
                  description="Side-by-side visuals for every flagged similarity"
                />
                <VerdictStep
                  title="Review the Full Picture"
                  description="The asset, the closest reference, and every supporting finding"
                />
                <VerdictStep
                  title="Verdict with Reasoning"
                  description="Risk score, plain-language explanation, and citations to the evidence"
                />
              </div>
              <div className="mt-7 pt-5 border-t border-white/10">
                <div className="text-[10px] text-red-300/80 uppercase tracking-[0.22em] font-semibold mb-2">
                  Built for legal review
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  Reviewers see the match, the reference, and the reasoning —
                  everything they need to make the call.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Benchmark ================= */}
      <section className="relative bg-cream-dark/40 border-t border-stone-200 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-50 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-emerald-600" />
              Benchmark
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black text-stone-900 tracking-[-0.03em] leading-[1.05] text-balance max-w-3xl mx-auto">
              Purpose-built IP detection beats{" "}
              <span className="text-stone-400">general-purpose vision models.</span>
            </h2>
          </div>

          <div className="relative isolate overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm shadow-stone-900/5 max-w-3xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-stone-400 text-[10px] uppercase tracking-[0.18em] border-b border-stone-200">
                    <th className="text-left px-6 py-5 font-semibold">Approach</th>
                    <th className="text-right px-6 py-5 font-semibold">
                      Accuracy <span className="text-stone-300 font-mono">↑</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {BENCHMARK_ROWS.map((row) => (
                    <BenchmarkRow key={row.name} {...row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-6 text-[11px] text-stone-400 text-center max-w-3xl mx-auto tracking-wide">
            Based on MegaYours internal benchmark. Methodology available on request.
          </p>
        </div>
      </section>

      {/* ================= Use cases ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-50 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-stone-600" />
              Where teams use it
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black text-stone-900 tracking-[-0.03em] leading-[1.05] text-balance">
              Clearance for{" "}
              <span className="text-gradient-red">film, gaming, and creative IP.</span>
            </h2>
            <p className="mt-4 text-stone-500 max-w-2xl mx-auto text-balance leading-relaxed">
              Legal and IP teams use MegaYours to clear new visual work against
              existing protected references — before the asset reaches production,
              marketing, or release.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UseCaseCard
              icon="controller"
              title="Game studios"
              description="Check characters, skins, environments, textures, and marketing assets."
            />
            <UseCaseCard
              icon="sparkles"
              title="AI creative tools"
              description="Add pre-publication copyright clearance to image generation workflows."
            />
            <UseCaseCard
              icon="registry"
              title="Brand & rightsholder registries"
              description="Let IP owners register assets for detection and enforcement."
            />
            <UseCaseCard
              icon="megaphone"
              title="Marketing & promo art"
              description="Check posters, key art, and campaign assets for unintentional likeness to protected works."
            />
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="relative bg-stone-950 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow w-[700px] h-[700px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/15" />
        </div>
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
            See it on{" "}
            <span className="text-gradient-cream">your own work.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-lg mx-auto text-balance leading-relaxed">
            Send us a representative scene, character, or asset. We'll run a
            clearance check and walk you through the report.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={DEMO_MAILTO}
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-white text-stone-900 rounded-full text-sm font-semibold shadow-2xl shadow-black/40 hover:-translate-y-0.5 transition-all"
            >
              Contact us
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 border border-white/15 backdrop-blur-sm text-white/80 rounded-full text-sm font-semibold hover:bg-white/10 hover:border-white/25 transition-all"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* ================= Footer ================= */}
      <footer className="border-t border-stone-200 py-10 bg-cream">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <Link to="/" className="font-semibold text-stone-600 hover:text-stone-900 transition-colors">
              MegaYours
            </Link>
            <span>· Copyright Intelligence Layer</span>
          </div>
          <span className="tabular-nums">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- Problem card ---------- */
function ProblemCard({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-stone-200/80 p-7 card-elevated card-elevated-hover transition-all overflow-hidden">
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
      <div className="relative">
        <div className="font-mono text-[10px] font-semibold text-stone-300 tracking-[0.2em] mb-4">
          {index}
        </div>
        <h3 className="font-bold text-stone-900 text-[1.05rem] mb-2 tracking-tight leading-snug text-balance">
          {title}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ---------- Phase 2 verdict step ---------- */
function VerdictStep({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-6 h-6 mt-0.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-xs">
        →
      </div>
      <div>
        <div className="text-sm font-semibold text-white/85">{title}</div>
        <div className="text-xs text-white/40 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

/* ---------- Phase 1 evidence row ---------- */
function EvidenceRow({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group/row flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center group-hover/row:border-red-400/40 group-hover/row:from-red-500/10 transition-all">
        <svg
          className="w-4 h-4 text-white/60 group-hover/row:text-red-300 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={EVIDENCE_ICONS[icon]}
          />
        </svg>
      </div>
      <div className="pt-0.5">
        <div className="text-sm font-semibold text-white/85">{title}</div>
        <div className="text-xs text-white/45 mt-0.5 leading-relaxed">
          {description}
        </div>
      </div>
    </div>
  );
}

const EVIDENCE_ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M4 4h4m8 0h4v4m0 8v4h-4M8 20H4v-4M9 12h6",
  type: "M4 6h16M4 12h8m-8 6h16",
};

/* ---------- Use case card ---------- */
const USE_CASE_ICONS: Record<string, string> = {
  controller:
    "M6 10h.01M10 8v4m-2-2h4m6 0h.01M16 12h.01M7 16h10a4 4 0 004-4 4 4 0 00-4-4H7a4 4 0 00-4 4 4 4 0 004 4z",
  sparkles:
    "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  registry:
    "M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z M8 8h8M8 12h8M8 16h5",
  megaphone:
    "M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 010 7.07 M19.07 4.93a10 10 0 010 14.14",
};

function UseCaseCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-white rounded-2xl border border-stone-200/80 p-6 card-elevated card-elevated-hover transition-all overflow-hidden">
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/60 flex items-center justify-center mb-5 group-hover:from-red-50 group-hover:to-orange-50 group-hover:border-red-200/60 transition-colors">
        <svg
          className="w-5 h-5 text-stone-500 group-hover:text-red-600 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.6}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={USE_CASE_ICONS[icon]}
          />
        </svg>
      </div>
      <h3 className="relative font-bold text-stone-900 text-[0.95rem] mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="relative text-xs text-stone-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/* ---------- Benchmark table ---------- */
type BenchmarkRowData = {
  name: string;
  description: string;
  accuracy: number;
  highlight?: boolean;
};

const BENCHMARK_ROWS: BenchmarkRowData[] = [
  {
    name: "OpenAI CLIP",
    description: "Image-similarity AI — recognises what it has seen, blank on the rest",
    accuracy: (0.704 + 0.0) / 2,
  },
  {
    name: "Google SigLIP",
    description: "Image-similarity AI — same blind spot on lesser-known IP",
    accuracy: (0.609 + 0.0) / 2,
  },
  {
    name: "Gemini 2.5",
    description: "Names household IPs; on lesser-known marks with no readable text, returns nothing",
    accuracy: (0.962 + 0.05) / 2,
  },
  {
    name: "GPT-4.1",
    description: "Same pattern — strong on famous IPs, silent on lesser-known visual marks",
    accuracy: (0.872 + 0.04) / 2,
  },
  {
    name: "MegaYours (Light)",
    description: "Indexed-catalog matching — broad, low-latency coverage of registered IP",
    accuracy: (0.258 + 0.923) / 2,
  },
  {
    name: "MegaYours (Max)",
    description: "Catalog matching plus AI review layer — full coverage across famous and lesser-known IP",
    accuracy: (0.981 + 0.976) / 2,
    highlight: true,
  },
];

function BenchmarkRow({
  name,
  description,
  accuracy,
  highlight,
}: BenchmarkRowData) {
  const rowCls = highlight
    ? "bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent"
    : "hover:bg-stone-50/60 transition-colors";
  const nameCls = highlight ? "text-emerald-700" : "text-stone-800";
  const pct = Math.round(accuracy * 100);
  const barColor = highlight
    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : "bg-stone-300";
  const textColor = highlight
    ? "text-emerald-700 font-bold"
    : "text-stone-600";
  return (
    <tr className={`${rowCls} border-t border-stone-100`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          {highlight && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
          )}
          <div className={`text-sm font-semibold tracking-tight ${nameCls}`}>
            {name}
          </div>
        </div>
        <div className="text-xs text-stone-400 mt-0.5">{description}</div>
      </td>
      <td className="text-right px-6 py-5 font-mono tabular-nums">
        <div className="flex items-center justify-end gap-3">
          <div className="hidden sm:block w-24 h-1.5 rounded-full bg-stone-100 overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-sm w-10 text-right ${textColor}`}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}
