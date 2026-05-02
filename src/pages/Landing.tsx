import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

const DEMO_MAILTO =
  "mailto:antonio.palma@megayours.com?subject=MegaYours%20Demo%20Request";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative">
      {/* ================= Hero ================= */}
      <section className="relative overflow-hidden">
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow animate-float-slow w-[520px] h-[520px] -top-40 -left-32 bg-red-400/25" />
          <div className="ambient-glow animate-float-slow-reverse w-[480px] h-[480px] top-20 -right-32 bg-amber-300/30" />
          <div className="ambient-glow w-[640px] h-[640px] top-40 left-1/2 -translate-x-1/2 bg-orange-200/30" />
        </div>
        {/* Grid backdrop with radial fade */}
        <div className="absolute inset-0 bg-grid mask-radial-top pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 lg:pt-24 pb-20">
          <div className="text-center max-w-3xl mx-auto animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.18em] uppercase px-3.5 py-1.5 rounded-full mb-7 shadow-sm shadow-stone-900/5">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 bg-red-500 rounded-full animate-pulse-dot" />
                <span className="relative bg-red-600 rounded-full w-1.5 h-1.5" />
              </span>
              Multi-Stage Visual Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-[-0.035em] leading-[1.05] text-stone-900 text-balance">
              Visual{" "}
              <span className="text-gradient-red">Similarity Scoring</span>
              {" "}That Understands Meaning
            </h1>
            <p className="mt-7 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed text-balance">
              A proprietary multi-stage algorithm that scores visual similarity at the semantic
              level — not pixel matching. Structural analysis, concept identity, template detection,
              and OCR working in concert, returning a confidence score in seconds.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 justify-center">
              {user ? (
                <>
                  <Link
                    to="/check"
                    className="group relative px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold overflow-hidden shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Try it now
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                  <Link
                    to="/registry"
                    className="px-6 py-3 border border-stone-300/80 bg-white/60 backdrop-blur text-stone-700 rounded-full text-sm font-semibold hover:bg-white hover:border-stone-400 transition-all"
                  >
                    Your registry
                  </Link>
                </>
              ) : (
                <>
                  <a
                    href={DEMO_MAILTO}
                    className="group relative px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold overflow-hidden shadow-lg shadow-stone-900/20 hover:shadow-xl hover:shadow-stone-900/30 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Request a demo
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </a>
                  <a
                    href="#how-it-works"
                    className="px-6 py-3 border border-stone-300/80 bg-white/60 backdrop-blur text-stone-700 rounded-full text-sm font-semibold hover:bg-white hover:border-stone-400 transition-all"
                  >
                    Learn more
                  </a>
                </>
              )}
            </div>

            {/* trust ribbon */}
            <div className="mt-16 flex items-center justify-center gap-6 text-[11px] font-medium text-stone-400 uppercase tracking-[0.2em]">
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-stone-400" />
                Sub-10s latency
              </span>
              <span className="hidden sm:inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-stone-400" />
                1152d embeddings
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-stone-400" />
                Reasoned verdicts
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Stats ================= */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map(({ value, label, suffix }, i) => (
            <div
              key={label}
              className="group relative bg-white/80 backdrop-blur rounded-2xl border border-stone-200/80 p-6 card-elevated card-elevated-hover transition-all overflow-hidden"
            >
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-stone-900/10 to-transparent" />
              <div className="flex items-baseline gap-1">
                <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight tabular-nums">
                  {value}
                </div>
                {suffix && (
                  <div className="text-lg font-bold text-stone-400">{suffix}</div>
                )}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-2 font-semibold">
                {label}
              </div>
              <div
                className="absolute -bottom-1 left-6 h-0.5 w-0 bg-gradient-to-r from-red-500 to-orange-400 group-hover:w-[calc(100%-3rem)] transition-all duration-500"
                style={{ transitionDelay: `${i * 40}ms` }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ================= Algorithm (dark) ================= */}
      <section id="how-it-works" className="relative bg-stone-950 text-white scroll-mt-16 overflow-hidden">
        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow w-[600px] h-[600px] -top-40 -left-40 bg-red-600/15" />
          <div className="ambient-glow w-[500px] h-[500px] top-1/3 -right-40 bg-amber-500/10" />
        </div>
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-red-400" />
              The Algorithm
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
              Gather Evidence. <span className="text-gradient-cream">Reach a Verdict.</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto text-balance leading-relaxed">
              Like building a case — independent evidence stages each produce a signal.
              When the evidence is strong enough, our judgment layer examines the
              full picture and delivers a verdict with reasoning.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative">
            {/* Connecting arrow between phases on md+ */}
            <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-white/10 flex items-center justify-center shadow-2xl shadow-black/50">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            {/* Phase 1 */}
            <div className="relative isolate bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 gradient-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-900/40">
                  1
                </div>
                <span className="text-[10px] font-semibold text-red-300/70 uppercase tracking-[0.2em]">Phase One</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">Gather the Evidence</h3>
              <p className="text-sm text-white/50 mb-7 leading-relaxed">
                Four independent detection stages run in parallel, each producing its own
                similarity signal and evidence payload. Fast, cheap, and domain-agnostic.
              </p>
              <div className="space-y-3.5">
                <EvidenceRow icon="eye" title="Structural Analysis" description="Shapes, spatial composition, distinctive anatomy" />
                <EvidenceRow icon="brain" title="Semantic Understanding" description="Concept identity, associations, style fingerprinting" />
                <EvidenceRow icon="scan" title="Template Matching" description="Direct visual comparison across scales and orientations" />
                <EvidenceRow icon="type" title="Text Recognition" description="Word marks, names, typographic elements via OCR" />
              </div>
            </div>

            {/* Phase 2 */}
            <div className="relative isolate bg-white/[0.03] backdrop-blur-sm rounded-3xl p-8 gradient-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-red-900/40">
                  2
                </div>
                <span className="text-[10px] font-semibold text-red-300/70 uppercase tracking-[0.2em]">Phase Two</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight mb-3">Reach a Verdict</h3>
              <p className="text-sm text-white/50 mb-7 leading-relaxed">
                When the evidence is strong enough, our judgment layer receives the input image,
                the closest canonical reference, and all gathered evidence — then delivers a verdict
                with detailed reasoning.
              </p>
              <div className="space-y-4">
                <VerdictStep title="Evidence threshold met?" description="Calibrated per reference set, not per use-case" />
                <VerdictStep title="Examines the full picture" description="Input image + closest reference + all stage evidence" />
                <VerdictStep title="Verdict with reasoning" description="Confidence score, explanation, and per-stage breakdown" />
              </div>
              <div className="mt-7 pt-5 border-t border-white/10">
                <div className="text-[10px] text-red-300/80 uppercase tracking-[0.22em] font-semibold mb-2">
                  The question is the variable
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  Same evidence pipeline, different question asked — IP infringement,
                  content policy, licensing compliance, deduplication confidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Semantic pitch ================= */}
      <section className="relative border-b border-stone-200 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-60 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
                <span className="w-1 h-1 rounded-full bg-stone-600" />
                Why semantic
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-[-0.025em] leading-[1.08] text-balance">
                Semantic similarity, not{" "}
                <span className="text-stone-400">pixel matching.</span>
              </h2>
            </div>
            <div className="md:col-span-7 space-y-5">
              <p className="text-stone-600 leading-relaxed text-[1.02rem]">
                Traditional tools rely on perceptual hashing — they check if two images are pixel-identical.
                When an image is <em className="text-stone-900 font-medium not-italic">conceptually similar</em> but shares no pixels with the reference,
                hash-based tools see nothing.
              </p>
              <p className="text-stone-600 leading-relaxed text-[1.02rem]">
                Our pipeline combines structural analysis with semantic understanding, template matching,
                and OCR to detect similarity across contexts, styles, and transformations — then renders
                a contextual verdict tuned to your specific use-case.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                {["Structural", "Semantic", "Template", "OCR", "Verdict"].map((t) => (
                  <span key={t} className="text-xs font-semibold text-stone-600 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-sm">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Benchmarks (dark) ================= */}
      <section className="relative bg-stone-950 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow w-[520px] h-[520px] -top-20 right-1/4 bg-emerald-500/10" />
          <div className="ambient-glow w-[520px] h-[520px] bottom-0 -left-20 bg-red-500/10" />
        </div>
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none" aria-hidden />

        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              Real Benchmark Results
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
              Every Other Approach <span className="text-gradient-cream">Picks a Side.</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto text-balance leading-relaxed">
              Vector-search services like <span className="text-white/80">Clarifai</span> catch the
              long tail — but flag Daffy as Donald, Pepsi as Coca-Cola, Prada as Gucci. Pure VLMs
              like <span className="text-white/80">Gemini</span> and <span className="text-white/80">GPT-4.1</span>
              don't hallucinate, but they go silent on registered marks they've never been trained on.
              We index 1,000+ trademarks and combine visual retrieval with a VLM verifier — recall
              of the embedding services, precision of the VLMs.
            </p>
          </div>

          {/* Stats strip — headline numbers above the data table */}
          <div className="grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto mb-10">
            <StatTile
              value="1,000+"
              label="Registered trademarks indexed — including the long tail"
            />
            <StatTile
              value="Two failure modes"
              label="VLMs miss less-known brands · vector search flags every lookalike"
            />
            <StatTile
              value="0%"
              label="False alarms across the whole benchmark"
              accent="emerald"
            />
          </div>

          {/* Quantitative benchmark */}
          <div className="mb-14">
            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm gradient-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-white/40 text-[10px] uppercase tracking-[0.18em] border-b border-white/5">
                      <th className="text-left px-6 py-5 font-semibold">Approach</th>
                      <th className="text-right px-4 py-5 font-semibold">
                        Caught <ArrowUp />
                      </th>
                      <th className="text-right px-4 py-5 font-semibold">
                        Correct when flagged <ArrowUp />
                      </th>
                      <th className="text-right px-6 py-5 font-semibold">
                        False alarms <ArrowDown />
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
            <div className="mt-5 grid sm:grid-cols-3 gap-3 text-[11px] text-white/40">
              <LegendItem label="Caught" text="share of real infringements the approach detected." />
              <LegendItem label="Correct when flagged" text="when it raises an alert, how often it's actually right." />
              <LegendItem label="False alarms" text="share of legitimate images wrongly flagged." />
            </div>
            <p className="mt-5 text-[11px] text-white/30 text-center">
              Threshold 0.75 (cosine) / 0.50 (VLM confidence). Same references, same queries
              across every approach. Test mix spans household-name brands AND obscure
              EUIPO-registered marks — the regime where competing approaches fall apart.
            </p>
          </div>

          {/* Famous vs long-tail split — drilldown by brand familiarity */}
          <div className="mb-14">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-4">
                <span className="w-1 h-1 rounded-full bg-amber-300" />
                Famous brands vs the long tail
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-[-0.03em] leading-[1.1] text-balance">
                Each baseline is strong on <span className="text-gradient-cream">one half</span>.
                <br className="hidden sm:block" /> Our pipeline wins both.
              </h3>
              <p className="mt-3 text-white/50 max-w-2xl mx-auto text-[13px] leading-relaxed">
                Same evaluation, split by brand familiarity. <span className="text-white/75">Famous</span> =
                household names with rich in-the-wild references. <span className="text-white/75">Long-tail</span> =
                EUIPO-registered marks the open web rarely depicts.
              </p>
            </div>
            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm gradient-border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-white/40 text-[10px] uppercase tracking-[0.18em] border-b border-white/5">
                      <th className="text-left px-6 py-5 font-semibold">Approach</th>
                      <th className="text-right px-4 py-5 font-semibold">
                        Famous brands <ArrowUp />
                      </th>
                      <th className="text-right px-4 py-5 font-semibold">
                        Long-tail brands <ArrowUp />
                      </th>
                      <th className="text-right px-6 py-5 font-semibold">
                        Time / query
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPLIT_ROWS.map((row) => (
                      <SplitRow key={row.name} {...row} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-5 grid sm:grid-cols-3 gap-3 text-[11px] text-white/40">
              <LegendItem label="Famous brands" text="F1 score on household names with rich in-the-wild references." />
              <LegendItem label="Long-tail brands" text="F1 score on registered marks the open web doesn't depict." />
              <LegendItem label="Time / query" text="end-to-end latency per detection (Apple Silicon, MPS)." />
            </div>
            <p className="mt-5 text-[11px] text-white/30 text-center max-w-3xl mx-auto">
              Notice the diagonal. Pure embedding models score on what they've seen — silent on
              the long tail. Pure VLMs know the household names — quieter on the obscure.
              Catalog-only retrieval gets the long tail but mismatches the famous brands' real-world
              renderings. Combining catalog retrieval with a VLM verifier covers both halves at once.
            </p>
          </div>

          {/* Two failure modes callout — the core differentiator */}
          <div className="mb-14 max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-7 sm:p-8">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-white/50 mb-3">
              <span className="w-1 h-1 rounded-full bg-amber-300" />
              Two opposing failure modes — we sit at the intersection
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-6 text-balance">
              Vector search flags every lookalike. Pure VLMs go silent on the long tail.
              <span className="text-emerald-200/90"> Our pipeline does neither.</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-5 text-sm">
              {/* Vector-search failure mode */}
              <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.04] p-5">
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-200/70 mb-3">
                  Clarifai · Vertex · CLIP — flagged as match
                </div>
                <ul className="space-y-1.5 text-white/75 mb-3">
                  <li>· <span className="font-semibold text-white">Daffy Duck</span>, <span className="font-semibold text-white">Howard the Duck</span>, <span className="font-semibold text-white">Mickey Mouse</span>, <span className="font-semibold text-white">Rubber Duck</span> → all "Donald Duck"</li>
                  <li>· <span className="font-semibold text-white">Pepsi</span>, <span className="font-semibold text-white">Virgin Cola</span>, generic red soda → all "Coca-Cola"</li>
                  <li>· <span className="font-semibold text-white">Prada</span>, <span className="font-semibold text-white">Chanel</span>, <span className="font-semibold text-white">Dolce&nbsp;&amp;&nbsp;Gabbana</span> → all "Gucci"</li>
                </ul>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Pure visual similarity can't distinguish a brand from its competitors —
                  Clarifai posts <span className="text-red-200/80 font-semibold">80% false-alarm rate</span> on this benchmark.
                </p>
              </div>
              {/* VLM failure mode */}
              <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-amber-200/70 mb-3">
                  Gemini · GPT-4.1 — returned nothing
                </div>
                <ul className="space-y-1.5 text-white/75 mb-3">
                  <li>· <span className="font-semibold text-white">Arctic Berry</span> — both VLMs silent</li>
                  <li>· <span className="font-semibold text-white">EcoFloor</span>, <span className="font-semibold text-white">RILLOS</span> — outside the household-name training set</li>
                  <li>· Stylised <span className="font-semibold text-white">Donald Duck</span> renderings (AI-generated, hand-drawn) — GPT-4.1 didn't recognise them</li>
                </ul>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  VLMs score <span className="text-amber-200/80 font-semibold">100% precision</span>
                  when they answer — they don't hallucinate. They just go quiet on the long tail.
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs text-white/55 leading-relaxed text-center max-w-3xl mx-auto">
              Our pipeline <span className="text-emerald-200/90 font-semibold">retrieves first, verifies second</span>.
              Visual retrieval against 1,000+ indexed marks catches the long tail like Clarifai does.
              A VLM verifier on top suppresses the lookalikes that retrieval false-positives on. Net result:
              the recall of the embedding services, the precision of the VLMs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/coca_cola_neon_sign.jpg`}
              title="Coca-Cola neon sign"
              subtitle="Real infringement — distorted, glowing, non-standard"
              verdict="match"
              rows={[
                { name: "Vertex AI Search", score: 0.601, result: "miss" },
                { name: "Clarifai Visual Search", score: 0.779, result: "match" },
                { name: "Gemini (no pipeline)", score: 1.0, result: "match" },
                { name: "MegaYours", score: 1.0, result: "match" },
              ]}
            />
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/mickey_mouse.webp`}
              title="Mickey Mouse"
              subtitle='Scanned against Donald Duck — similar but not the same IP'
              verdict="no-match"
              rows={[
                { name: "Vertex AI Search", score: 0.875, result: "false-alarm" },
                { name: "Clarifai Visual Search", score: 0.882, result: "false-alarm", note: "Top hit was a Donald Duck reference" },
                { name: "Gemini (no pipeline)", score: null, result: "no-match" },
                { name: "MegaYours", score: null, result: "no-match" },
              ]}
            />
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/arctic_berry_banner.png`}
              title="Arctic Berry banner"
              subtitle="EUIPO-registered mark — outside the household-name VLM training set"
              verdict="match"
              rows={[
                { name: "Clarifai Visual Search", score: 0.733, result: "match" },
                { name: "Gemini (no pipeline)", score: null, result: "miss", note: "Returned no detections — doesn't recognise the brand" },
                { name: "GPT-4.1 (no pipeline)", score: null, result: "miss", note: "Returned no detections — doesn't recognise the brand" },
                { name: "MegaYours", score: 0.95, result: "match" },
              ]}
            />
          </div>

          <p className="mt-8 text-center text-[11px] text-white/30">
            Scores from actual API calls. Gemini 2.5 Flash and GPT-4.1 in open-vocab mode (no
            candidate list — it doesn't scale to 1,000+ trademarks). Clarifai Visual Search
            against the indexed reference set, threshold 0.75.
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
              Applications
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black text-stone-900 tracking-[-0.03em] leading-[1.05] text-balance">
              Built for <span className="text-gradient-red">many applications.</span>
            </h2>
            <p className="mt-4 text-stone-500 max-w-2xl mx-auto text-balance leading-relaxed">
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

      {/* ================= CTA ================= */}
      <section className="relative bg-stone-950 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="ambient-glow w-[700px] h-[700px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600/15" />
        </div>
        <div className="absolute inset-0 bg-grid-dark mask-radial pointer-events-none" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
            See it in <span className="text-gradient-cream">action.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-lg mx-auto text-balance leading-relaxed">
            Tell us what you're working on and we'll walk you through the algorithm
            with your own images.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href={DEMO_MAILTO}
              className="group relative inline-flex items-center gap-2 px-8 py-3.5 bg-white text-stone-900 rounded-full text-sm font-semibold shadow-2xl shadow-black/40 hover:-translate-y-0.5 transition-all"
            >
              Request a demo
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
      <footer className="border-t border-stone-200 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="font-semibold text-stone-600">MegaYours</span>
            <span>· Visual Similarity Scoring</span>
          </div>
          <span className="tabular-nums">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- stats data ---------- */
const STATS: { value: string; label: string; suffix?: string }[] = [
  { value: "4", label: "Detection stages" },
  { value: "<10", label: "Scoring latency", suffix: "s" },
  { value: "1152", label: "Embedding dimensions", suffix: "d" },
  { value: "0.75", label: "High-confidence band", suffix: "+" },
];

/* ---------- small bits ---------- */
function ArrowUp() {
  return <span className="inline-block text-white/25 font-mono ml-0.5">↑</span>;
}
function ArrowDown() {
  return <span className="inline-block text-white/25 font-mono ml-0.5">↓</span>;
}

function LegendItem({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 w-1 h-1 rounded-full bg-white/30 shrink-0" />
      <div>
        <span className="text-white/70 font-semibold">{label}:</span>{" "}
        <span className="text-white/40">{text}</span>
      </div>
    </div>
  );
}

function StatTile({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: "emerald";
}) {
  const valueClass =
    accent === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm px-5 py-5 text-center">
      <div className={`text-2xl sm:text-[1.75rem] font-black tracking-tight leading-tight ${valueClass}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-white/55 leading-snug">
        {label}
      </div>
    </div>
  );
}

function VerdictStep({ title, description }: { title: string; description: string }) {
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

function EvidenceRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group/row flex items-start gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02] border border-white/10 flex items-center justify-center group-hover/row:border-red-400/40 group-hover/row:from-red-500/10 transition-all">
        <svg className="w-4 h-4 text-white/60 group-hover/row:text-red-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </div>
      <div className="pt-0.5">
        <div className="text-sm font-semibold text-white/85">{title}</div>
        <div className="text-xs text-white/45 mt-0.5 leading-relaxed">{description}</div>
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
    <div className="group relative bg-white rounded-2xl border border-stone-200/80 p-6 card-elevated card-elevated-hover transition-all overflow-hidden">
      <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br from-red-100 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl" />
      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-200/60 flex items-center justify-center mb-5 group-hover:from-red-50 group-hover:to-orange-50 group-hover:border-red-200/60 transition-colors">
        <svg className="w-5 h-5 text-stone-500 group-hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d={USE_CASE_ICONS[icon]} />
        </svg>
      </div>
      <h3 className="relative font-bold text-stone-900 text-[0.95rem] mb-1.5 tracking-tight">{title}</h3>
      <p className="relative text-xs text-stone-500 leading-relaxed">{description}</p>
    </div>
  );
}

type ComparisonRow = {
  name: string;
  score: number | null;
  result: "match" | "miss" | "no-match" | "false-alarm";
  note?: string;
};

const RESULT_STYLES: Record<ComparisonRow["result"], { label: string; bg: string; text: string; ring: string }> = {
  match:       { label: "Match",       bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-1 ring-inset ring-emerald-400/20" },
  miss:        { label: "Missed",      bg: "bg-red-500/15",     text: "text-red-300",     ring: "ring-1 ring-inset ring-red-400/20" },
  "no-match":  { label: "No match",    bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-1 ring-inset ring-emerald-400/20" },
  "false-alarm": { label: "False alarm", bg: "bg-red-500/15",   text: "text-red-300",     ring: "ring-1 ring-inset ring-red-400/20" },
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
    <div className="relative isolate bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden gradient-border">
      <div className="aspect-[4/3] bg-stone-900 relative overflow-hidden">
        {/* Blurred, darkened backdrop — fills card edge-to-edge regardless of image aspect */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center scale-125"
          style={{
            backgroundImage: `url(${image})`,
            filter: "blur(40px) saturate(1.4) brightness(0.5)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(12,10,9,0.2) 0%, rgba(12,10,9,0.7) 100%)",
          }}
        />
        {/* Centered framed thumbnail — square crop unifies landscape/portrait sources */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="relative aspect-square h-full max-h-full rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <span className={`text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full ring-1 ring-inset backdrop-blur-md ${
            verdict === "match"
              ? "bg-emerald-500/25 text-emerald-200 ring-emerald-400/40"
              : "bg-stone-950/70 text-white/85 ring-white/20"
          }`}>
            {verdict === "match" ? "Real infringement" : "Not infringing"}
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
        <p className="text-xs text-white/45 mt-1 mb-5">{subtitle}</p>
        <div className="space-y-2.5">
          {rows.map((row) => {
            const style = RESULT_STYLES[row.result];
            const isMegaYours = row.name === "MegaYours";
            return (
              <div
                key={row.name}
                className={`relative rounded-xl px-3 py-2.5 ${
                  isMegaYours ? "bg-white/[0.04] border border-white/10" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${isMegaYours ? "text-white font-semibold" : "text-white/70"}`}>
                    {row.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/35 font-mono tabular-nums w-12 text-right">
                      {row.score != null ? row.score.toFixed(2) : "—"}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full ${style.bg} ${style.text} ${style.ring}`}>
                      {style.label}
                    </span>
                  </div>
                </div>
                {row.note && (
                  <p className="text-[10px] text-white/35 mt-1 italic">{row.note}</p>
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

// Known/unknown split table — populated from compare_vlm.py + compare_clip.py
// against a 50/50 mix of famous brands and obscure EUIPO marks (synthetic
// queries). F1 at the operating threshold each approach was tuned for.
type SplitRowData = {
  name: string;
  description: string;
  f1Known: number;
  f1Unknown: number;
  timeSec: number;
  highlight?: boolean;
};

const SPLIT_ROWS: SplitRowData[] = [
  { name: "OpenAI CLIP ViT-L/14", description: "Pure embedding retrieval — works on what it's seen, blank on the rest", f1Known: 0.704, f1Unknown: 0.0, timeSec: 0.1 },
  { name: "SigLIP2 (embedding only)", description: "Stronger semantic embeddings — same long-tail blind spot", f1Known: 0.609, f1Unknown: 0.0, timeSec: 0.1 },
  { name: "Gemini 2.5 Flash (no pipeline)", description: "Open-vocab judge — knows household names, silent on registered-but-obscure", f1Known: 0.962, f1Unknown: 0.895, timeSec: 2.6 },
  { name: "MegaYours (Light)", description: "Indexed catalog hit-or-miss — perfect on the obscure, weak on stylised in-the-wild", f1Known: 0.258, f1Unknown: 0.923, timeSec: 13.1 },
  { name: "MegaYours (Max)", description: "Catalog retrieval + VLM verification — first to cover both halves", f1Known: 0.981, f1Unknown: 0.976, timeSec: 16.3, highlight: true },
];

const BENCHMARK_ROWS: BenchmarkRowData[] = [
  { name: "OpenAI CLIP ViT-L/14", description: "Standard image-text embedding model", recall: 0.704, precision: 0.704, fpr: 0.8 },
  { name: "Vertex AI Embeddings", description: "Google Cloud multimodal vector search", recall: 0.333, precision: 0.643, fpr: 0.5 },
  { name: "Clarifai Visual Search", description: "Catches the long tail — but flags Daffy as Donald, Pepsi as Coca-Cola, Prada as Gucci", recall: 0.963, precision: 0.765, fpr: 0.8 },
  { name: "Google Vision Logo API", description: "Cloud Vision logo detection — household-brand registry only", recall: 0.333, precision: 0.9, fpr: 0.1 },
  { name: "Gemini 2.5 Flash (no pipeline)", description: "Asked to name every brand it sees — silent on long-tail registered marks", recall: 0.926, precision: 1.0, fpr: 0.0 },
  { name: "GPT-4.1 (no pipeline)", description: "Asked to name every brand it sees — silent on long-tail and stylised renderings", recall: 0.815, precision: 1.0, fpr: 0.0 },
  { name: "MegaYours (Max)", description: "Visual retrieval + VLM verification — catches the long tail without flagging lookalikes", recall: 0.963, precision: 1.0, fpr: 0.0, highlight: true },
];

function fmtPct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function BenchmarkCell({
  value,
  highlight,
  inverse = false,
}: {
  value: number;
  highlight?: boolean;
  inverse?: boolean;
}) {
  // For inverse metrics (false alarms), lower is better — so flip the bar direction visually.
  const pct = Math.round(value * 100);
  const barColor = highlight
    ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
    : inverse
      ? "bg-red-400/50"
      : "bg-white/25";
  const textColor = highlight
    ? "text-emerald-200 font-bold"
    : "text-white/70";
  return (
    <td className="text-right px-4 py-5 font-mono tabular-nums">
      <div className="flex items-center justify-end gap-3">
        <div className="hidden sm:block w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-sm ${textColor} w-10 text-right`}>{fmtPct(value)}</span>
      </div>
    </td>
  );
}

function BenchmarkRow({ name, description, recall, precision, fpr, highlight }: BenchmarkRowData) {
  const rowCls = highlight
    ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent"
    : "hover:bg-white/[0.02] transition-colors";
  const nameCls = highlight ? "text-emerald-200" : "text-white/85";
  return (
    <tr className={`${rowCls} border-t border-white/5`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          {highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />}
          <div className={`text-sm font-semibold tracking-tight ${nameCls}`}>{name}</div>
        </div>
        <div className="text-xs text-white/40 mt-0.5">{description}</div>
      </td>
      <BenchmarkCell value={recall} highlight={highlight} />
      <BenchmarkCell value={precision} highlight={highlight} />
      <BenchmarkCell value={fpr} highlight={highlight} inverse />
    </tr>
  );
}

function fmtTime(seconds: number) {
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toFixed(1)} s`;
}

function SplitTimeCell({ value }: { value: number }) {
  return (
    <td className="text-right px-4 py-5 font-mono tabular-nums">
      <span className="text-sm text-white/55">{fmtTime(value)}</span>
    </td>
  );
}

function SplitRow({ name, description, f1Known, f1Unknown, timeSec, highlight }: SplitRowData) {
  const rowCls = highlight
    ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent"
    : "hover:bg-white/[0.02] transition-colors";
  const nameCls = highlight ? "text-emerald-200" : "text-white/85";
  return (
    <tr className={`${rowCls} border-t border-white/5`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          {highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />}
          <div className={`text-sm font-semibold tracking-tight ${nameCls}`}>{name}</div>
        </div>
        <div className="text-xs text-white/40 mt-0.5">{description}</div>
      </td>
      <BenchmarkCell value={f1Known} highlight={highlight} />
      <BenchmarkCell value={f1Unknown} highlight={highlight} />
      <SplitTimeCell value={timeSec} />
    </tr>
  );
}

const ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  type: "M4 6h16M4 12h8m-8 6h16",
};
