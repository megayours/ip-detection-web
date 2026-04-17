import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const DEMO_MAILTO =
  "mailto:antonio.palma@megayours.com?subject=MegaYours%20Demo%20Request";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-24 lg:pt-32 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-block bg-stone-900/5 border border-stone-900/10 text-stone-600 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
              Multi-Stage Visual Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-stone-900">
              Visual{" "}
              <span className="text-red-600">Similarity Scoring</span>
              {" "}That Understands Meaning
            </h1>
            <p className="mt-6 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
              A proprietary multi-stage algorithm that scores visual similarity at the semantic level —
              not pixel matching. Structural analysis, concept identity, template detection, and OCR
              working in concert, returning a confidence score in seconds.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              {user ? (
                <>
                  <Link
                    to="/check"
                    className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-all"
                  >
                    Try it now
                  </Link>
                  <Link
                    to="/registry"
                    className="px-6 py-3 border border-stone-300 text-stone-700 rounded-full text-sm font-semibold hover:bg-stone-50 transition-all"
                  >
                    Your registry
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href={DEMO_MAILTO}
                    className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-all"
                  >
                    Request a demo
                  </a>
                  <a
                    href="#how-it-works"
                    className="px-6 py-3 border border-stone-300 text-stone-700 rounded-full text-sm font-semibold hover:bg-stone-50 transition-all"
                  >
                    Learn more
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats — algorithm credibility */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "4", label: "Detection Stages" },
            { value: "<10s", label: "Scoring Latency" },
            { value: "1152d", label: "Embedding Dimensions" },
            { value: "0.75+", label: "High-Confidence Band" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="text-3xl sm:text-4xl font-black text-stone-900">{value}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-2 font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* The Algorithm — courtroom framing */}
      <section id="how-it-works" className="bg-stone-900 text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
              The Algorithm
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Gather Evidence. Reach a Verdict.
            </h2>
            <p className="mt-3 text-white/50 max-w-2xl mx-auto">
              Like building a case — independent evidence stages each produce a signal.
              When the evidence is strong enough, a vision-language model examines the
              full picture and delivers a verdict with reasoning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Phase 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-black">1</div>
                <h3 className="text-xl font-black">Gather the Evidence</h3>
              </div>
              <p className="text-sm text-white/50 mb-6">
                Four independent detection stages run in parallel, each producing its own
                similarity signal and evidence payload. Fast, cheap, and domain-agnostic.
              </p>
              <div className="space-y-3">
                <EvidenceRow icon="eye" title="Structural Analysis" description="Shapes, spatial composition, distinctive anatomy" />
                <EvidenceRow icon="brain" title="Semantic Understanding" description="Concept identity, associations, style fingerprinting" />
                <EvidenceRow icon="scan" title="Template Matching" description="Direct visual comparison across scales and orientations" />
                <EvidenceRow icon="type" title="Text Recognition" description="Word marks, names, typographic elements via OCR" />
              </div>
            </div>

            {/* Phase 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm font-black">2</div>
                <h3 className="text-xl font-black">Reach a Verdict</h3>
              </div>
              <p className="text-sm text-white/50 mb-6">
                When the evidence is strong enough, a vision-language model receives the input image,
                the closest canonical reference, and all gathered evidence — then delivers a verdict
                with detailed reasoning.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">→</div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">Evidence threshold met?</div>
                    <div className="text-xs text-white/40">Calibrated per reference set, not per use-case</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">→</div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">Examines the full picture</div>
                    <div className="text-xs text-white/40">Input image + closest reference + all stage evidence</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 text-xs">→</div>
                  <div>
                    <div className="text-sm font-semibold text-white/80">Verdict with reasoning</div>
                    <div className="text-xs text-white/40">Confidence score, explanation, and per-stage breakdown</div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">The prompt is the variable</div>
                <p className="text-xs text-white/40 leading-relaxed">
                  Same evidence pipeline, different question to the model — IP infringement,
                  content policy, licensing compliance, deduplication confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why semantic */}
      <section className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Semantic Similarity, Not Pixel Matching
            </h2>
            <p className="mt-4 text-stone-500 leading-relaxed">
              Traditional tools rely on perceptual hashing — they check if two images are pixel-identical.
              When an image is <em>conceptually similar</em> but shares no pixels with the reference,
              hash-based tools see nothing.
            </p>
            <p className="mt-3 text-stone-500 leading-relaxed">
              Our pipeline combines structural analysis with semantic understanding, template matching,
              and OCR to detect similarity across contexts, styles, and transformations — then lets
              a VLM interpret what the scores mean for your specific use-case.
            </p>
          </div>
        </div>
      </section>

      {/* Head-to-head comparison */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
              Real Benchmark Results
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Similarity Search Hits a Ceiling
            </h2>
            <p className="mt-3 text-white/50 max-w-2xl mx-auto">
              "Looks similar" and "is actually infringing" are two different questions.
              Here's how leading approaches perform on real images — same references, same queries.
            </p>
          </div>

          {/* Quantitative benchmark */}
          <div className="mb-14">
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-white/40 text-[10px] uppercase tracking-widest">
                    <th className="text-left px-5 py-4 font-semibold">Approach</th>
                    <th className="text-right px-3 py-4 font-semibold">
                      Caught <span className="normal-case tracking-normal text-white/25">↑</span>
                    </th>
                    <th className="text-right px-3 py-4 font-semibold">
                      Correct when flagged <span className="normal-case tracking-normal text-white/25">↑</span>
                    </th>
                    <th className="text-right px-5 py-4 font-semibold">
                      False alarms <span className="normal-case tracking-normal text-white/25">↓</span>
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
            <div className="mt-4 grid sm:grid-cols-3 gap-3 text-[11px] text-white/40">
              <div>
                <span className="text-white/60 font-semibold">Caught:</span>{" "}
                share of real infringements the approach detected.
              </div>
              <div>
                <span className="text-white/60 font-semibold">Correct when flagged:</span>{" "}
                when it raises an alert, how often it's actually right.
              </div>
              <div>
                <span className="text-white/60 font-semibold">False alarms:</span>{" "}
                share of legitimate images wrongly flagged.
              </div>
            </div>
            <p className="mt-4 text-[11px] text-white/30 text-center">
              Evaluated at threshold 0.75 across 32 images and 3 IPs — 22 real infringements, 10 lookalikes that shouldn't match.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* True positive — we catch, they miss */}
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/coca_cola_neon_sign.jpg`}
              title="Coca-Cola neon sign"
              subtitle="Real infringement — distorted, glowing, non-standard"
              verdict="match"
              rows={[
                { name: "Vertex AI Search", score: 0.601, result: "miss" },
                { name: "Google Vision API", score: 0.693, result: "match" },
                { name: "MegaYours", score: 0.769, result: "match" },
              ]}
            />

            {/* False positive — we reject, they flag */}
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/mickey_mouse.webp`}
              title="Mickey Mouse"
              subtitle='Scanned against Donald Duck — similar but not the same IP'
              verdict="no-match"
              rows={[
                { name: "Vertex AI Search", score: 0.875, result: "false-alarm" },
                { name: "Google Vision API", score: null, result: "miss", note: "Cannot detect characters — only reads text and known logos" },
                { name: "MegaYours", score: null, result: "no-match" },
              ]}
            />
          </div>

          <p className="mt-8 text-center text-xs text-white/30">
            Scores from actual API calls. Vertex AI: multimodalembedding@001, threshold 0.75.
          </p>
        </div>
      </section>

      {/* Use-cases tease */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Built for Many Applications
            </h2>
            <p className="mt-3 text-stone-500 max-w-2xl mx-auto">
              Semantic visual scoring is a primitive — the use-cases are broad.
              Here are a few directions we're exploring with early partners.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UseCaseCard
              icon="shield"
              title="IP & Brand Protection"
              description="Detect visual derivatives of protected assets across marketplaces, social media, and the open web."
            />
            <UseCaseCard
              icon="filter"
              title="Content Moderation"
              description="Score uploaded content against known reference sets to flag near-duplicates and visual copycats."
            />
            <UseCaseCard
              icon="search"
              title="Visual Search & Dedup"
              description="Find semantically similar images in large collections — beyond what pixel hashing or EXIF metadata can catch."
            />
            <UseCaseCard
              icon="check"
              title="Licensing Compliance"
              description="Let licensees self-check whether their designs stay within guidelines before submission."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-black tracking-tight">
            See it in action
          </h2>
          <p className="mt-3 text-white/50 max-w-lg mx-auto">
            Tell us what you're working on and we'll walk you through the algorithm
            with your own images.
          </p>
          <div className="mt-8">
            <a
              href={DEMO_MAILTO}
              className="inline-block px-8 py-3 bg-white text-stone-900 rounded-full text-sm font-semibold hover:bg-stone-100 transition-all"
            >
              Request a demo
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-stone-400">
          <span>MegaYours</span>
          <span>Visual Similarity Scoring</span>
        </div>
      </footer>
    </div>
  );
}

function EvidenceRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
        <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-white/80">{title}</div>
        <div className="text-xs text-white/40">{description}</div>
      </div>
    </div>
  );
}

const USE_CASE_ICONS: Record<string, string> = {
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  filter: "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
};

function UseCaseCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-100 transition-all">
      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={USE_CASE_ICONS[icon]} />
        </svg>
      </div>
      <h3 className="font-bold text-stone-900 text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-stone-500 leading-relaxed">{description}</p>
    </div>
  );
}

type ComparisonRow = {
  name: string;
  score: number | null;
  result: "match" | "miss" | "no-match" | "false-alarm";
  note?: string;
};

const RESULT_STYLES: Record<ComparisonRow["result"], { label: string; bg: string; text: string }> = {
  match:       { label: "Match",       bg: "bg-emerald-500/20", text: "text-emerald-400" },
  miss:        { label: "Missed",      bg: "bg-red-500/20",     text: "text-red-400" },
  "no-match":  { label: "No match",    bg: "bg-emerald-500/20", text: "text-emerald-400" },
  "false-alarm": { label: "False alarm", bg: "bg-red-500/20",   text: "text-red-400" },
};

function ComparisonCard({
  image,
  title,
  subtitle,
  verdict,
  rows,
}: {
  image: string;
  title: string;
  subtitle: string;
  verdict: "match" | "no-match";
  rows: ComparisonRow[];
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="aspect-[16/10] bg-black/30 relative overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-contain" />
        <div className="absolute top-3 right-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            verdict === "match"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/10 text-white/50"
          }`}>
            {verdict === "match" ? "Real infringement" : "Not infringing"}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-bold text-white text-base">{title}</h3>
        <p className="text-xs text-white/40 mt-1 mb-5">{subtitle}</p>
        <div className="space-y-2.5">
          {rows.map((row) => {
            const style = RESULT_STYLES[row.result];
            return (
              <div key={row.name}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/70">{row.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/30 font-mono w-12 text-right">
                      {row.score != null ? row.score.toFixed(2) : "—"}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
                {row.note && (
                  <p className="text-[10px] text-white/30 mt-0.5 italic">{row.note}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type BenchmarkRowData = {
  name: string;
  description: string;
  recall: number;
  precision: number;
  fpr: number;
  highlight?: boolean;
};

const BENCHMARK_ROWS: BenchmarkRowData[] = [
  { name: "OpenAI CLIP ViT-L/14", description: "Standard image-text embedding model", recall: 0.8182, precision: 0.6923, fpr: 0.8 },
  { name: "OpenAI CLIP ViT-L/14 @336px", description: "Higher-resolution variant", recall: 0.8182, precision: 0.72, fpr: 0.7 },
  { name: "Similarity search baseline", description: "Pure embedding comparison, no verification layer", recall: 0.5909, precision: 0.7222, fpr: 0.5 },
  { name: "MegaYours", description: "Full pipeline with confidence gating", recall: 0.9545, precision: 0.875, fpr: 0.3, highlight: true },
];

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function BenchmarkRow({ name, description, recall, precision, fpr, highlight }: BenchmarkRowData) {
  const rowCls = highlight ? "bg-emerald-500/10" : "";
  const nameCls = highlight ? "text-emerald-200" : "text-white/80";
  const numCls = highlight ? "text-emerald-300 font-bold" : "text-white/60";
  return (
    <tr className={`${rowCls} border-t border-white/5`}>
      <td className="px-5 py-4">
        <div className={`text-sm font-semibold ${nameCls}`}>{name}</div>
        <div className="text-xs text-white/40 mt-0.5">{description}</div>
      </td>
      <td className={`text-right px-3 py-4 font-mono tabular-nums ${numCls}`}>{fmtPct(recall)}</td>
      <td className={`text-right px-3 py-4 font-mono tabular-nums ${numCls}`}>{fmtPct(precision)}</td>
      <td className={`text-right px-5 py-4 font-mono tabular-nums ${numCls}`}>{fmtPct(fpr)}</td>
    </tr>
  );
}

const ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  type: "M4 6h16M4 12h8m-8 6h16",
};

