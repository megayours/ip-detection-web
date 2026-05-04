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
              Visual Copyright Clearance
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-black tracking-[-0.035em] leading-[1.05] text-stone-900 text-balance">
              Clear visual assets{" "}
              <span className="text-gradient-red">before they ship.</span>
            </h1>
            <p className="mt-7 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed text-balance">
              Pre-screen new characters, scenes, props, and creative assets against existing
              protected IP. We surface risky similarities, show the visual evidence behind each
              match, and produce reports your legal reviewers can act on.
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
                Side-by-side evidence
              </span>
              <span className="hidden sm:inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-stone-400" />
                Reports for legal review
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-stone-400" />
                Built with 100+ law firms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Stats ================= */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              How a clearance check runs
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
              Gather Evidence. <span className="text-gradient-cream">Reach a Verdict.</span>
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto text-balance leading-relaxed">
              The same shape as a legal review — gather independent evidence, then weigh
              the full picture. We surface the closest references, show why each was flagged,
              and hand your reviewer everything they need to make the call.
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
                Four independent checks run on every asset, each surfacing a different kind
                of similarity to a protected reference.
              </p>
              <div className="space-y-3.5">
                <EvidenceRow icon="eye" title="Visual likeness" description="Distinctive shapes, layout, and silhouettes" />
                <EvidenceRow icon="brain" title="Concept & style" description="Same character or theme, even when redrawn or restyled" />
                <EvidenceRow icon="scan" title="Direct comparison" description="Side-by-side check against the canonical reference" />
                <EvidenceRow icon="type" title="Wordmarks & text" description="Brand names, titles, and typographic elements" />
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
                Once the evidence is in, our review layer weighs the asset against the
                closest reference and the supporting findings, then delivers a clear verdict
                with the reasoning attached.
              </p>
              <div className="space-y-4">
                <VerdictStep title="Enough evidence?" description="Tunable per project — strict for licensed IP, looser for inspiration boards" />
                <VerdictStep title="Reviews the full picture" description="The asset, the closest reference, and every supporting finding" />
                <VerdictStep title="Verdict with reasoning" description="Risk score, plain-language explanation, and citations to the evidence" />
              </div>
              <div className="mt-7 pt-5 border-t border-white/10">
                <div className="text-[10px] text-red-300/80 uppercase tracking-[0.22em] font-semibold mb-2">
                  Built for legal review
                </div>
                <p className="text-xs text-white/45 leading-relaxed">
                  Every flag carries the side-by-side evidence behind it. Reviewers see the
                  match, the reference, and the reasoning — not just a number.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Why it matters ================= */}
      <section className="relative border-b border-stone-200 overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-60 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="grid md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
                <span className="w-1 h-1 rounded-full bg-stone-600" />
                Why it matters
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-[-0.025em] leading-[1.08] text-balance">
                Catches what a reviewer would.{" "}
                <span className="text-stone-400">Not just exact reuse.</span>
              </h2>
            </div>
            <div className="md:col-span-7 space-y-5">
              <p className="text-stone-600 leading-relaxed text-[1.02rem]">
                Existing image-search tools only flag near-identical reuses. They miss the
                cases that actually drive copyright disputes — the same character redrawn in a
                different style, a familiar silhouette in a new pose, a recognisable scene
                composition.
              </p>
              <p className="text-stone-600 leading-relaxed text-[1.02rem]">
                We compare assets the way a human reviewer does — by composition, concept,
                and style — and pair every flag with the side-by-side evidence behind it.
                Your team gets the kind of similarity they'd act on, not a wall of false
                positives.
              </p>
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
          {/* Famous vs long-tail split — drilldown by brand familiarity */}
          <div className="mb-14">
            <div className="text-center mb-7">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 backdrop-blur-sm text-white/60 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Real Benchmark Results
              </div>
              <h2 className="text-3xl sm:text-[2.75rem] font-black tracking-[-0.03em] leading-[1.05] text-balance">
                Each baseline is strong on <span className="text-gradient-cream">one half</span>.
                <br className="hidden sm:block" /> Our pipeline wins both.
              </h2>
            </div>
            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm gradient-border max-w-3xl mx-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/40 text-[10px] uppercase tracking-[0.18em] border-b border-white/5">
                      <th className="text-left px-6 py-5 font-semibold">Approach</th>
                      <th className="text-right px-6 py-5 font-semibold">
                        Accuracy <ArrowUp />
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
            <p className="mt-5 text-[11px] text-white/30 text-center max-w-3xl mx-auto">
              Image-similarity AIs recognise what they've seen and miss the rest.
              <span className="text-white/55"> AI assistants answer only when they recognise the IP or can read its name in the image.</span>
            </p>
          </div>

          {/* Two failure modes callout — what other tools get wrong */}
          <div className="mb-14 max-w-5xl mx-auto rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-7 sm:p-8">
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-white/50 mb-3">
              <span className="w-1 h-1 rounded-full bg-amber-300" />
              Where other tools fall short
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-6 text-balance">
              Image-search tools confuse competitors with the protected IP. AI assistants
              stay silent unless they already recognise the work.
              <span className="text-emerald-200/90"> We do neither.</span>
            </h3>
            <div className="grid md:grid-cols-2 gap-5 text-sm">
              {/* Image-search failure mode */}
              <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.04] p-5">
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-red-200/70 mb-3">
                  Image-similarity tools — flagged as match
                </div>
                <ul className="space-y-1.5 text-white/75 mb-3">
                  <li>· <span className="font-semibold text-white">Daffy Duck</span>, <span className="font-semibold text-white">Howard the Duck</span>, <span className="font-semibold text-white">Mickey Mouse</span>, <span className="font-semibold text-white">Rubber Duck</span> → all returned as "Donald Duck"</li>
                  <li>· <span className="font-semibold text-white">Pepsi</span>, <span className="font-semibold text-white">Virgin Cola</span>, generic red soda → all returned as "Coca-Cola"</li>
                  <li>· <span className="font-semibold text-white">Prada</span>, <span className="font-semibold text-white">Chanel</span>, <span className="font-semibold text-white">Dolce&nbsp;&amp;&nbsp;Gabbana</span> → all returned as "Gucci"</li>
                </ul>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Pure visual similarity can't tell a brand apart from its competitors. The
                  result is a flood of false alarms your reviewers have to sort through.
                </p>
              </div>
              {/* AI assistant failure mode */}
              <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5">
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-amber-200/70 mb-3">
                  AI assistants (Gemini, GPT-4.1) — returned nothing
                </div>
                <ul className="space-y-1.5 text-white/75 mb-3">
                  <li>· Figurative marks with no readable brand text → silent</li>
                  <li>· Lesser-known IPs outside the household-name training set → silent</li>
                  <li>· Stylised <span className="font-semibold text-white">Donald Duck</span> renderings (AI-generated, hand-drawn) → not recognised</li>
                </ul>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  AI assistants only flag what they already recognise. Anything outside the
                  household-name set goes past unnoticed.
                </p>
              </div>
            </div>
            <p className="mt-6 text-xs text-white/55 leading-relaxed text-center max-w-3xl mx-auto">
              We <span className="text-emerald-200/90 font-semibold">match against an indexed reference catalog first, then verify each candidate</span>.
              That catches the long tail of registered IP that AI assistants miss, and filters
              out the lookalikes that pure image search false-flags.
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
                { name: "Gemini", score: 1.0, result: "match" },
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
                { name: "Gemini", score: null, result: "no-match" },
                { name: "MegaYours", score: null, result: "no-match" },
              ]}
            />
            <ComparisonCard
              image={`${import.meta.env.BASE_URL}comparison/arctic_berry_banner.png`}
              title="Arctic Berry banner"
              subtitle="Lesser-known EUIPO-registered mark — the kind AI assistants don't recognise"
              verdict="match"
              rows={[
                { name: "Clarifai Visual Search", score: 0.733, result: "match" },
                { name: "Gemini", score: null, result: "miss", note: "Returned no detections — neither recognised nor readable" },
                { name: "GPT-4.1", score: null, result: "miss", note: "Returned no detections — neither recognised nor readable" },
                { name: "MegaYours", score: 0.95, result: "match" },
              ]}
            />
          </div>

          <p className="mt-8 text-center text-[11px] text-white/30">
            Scores from real runs against each provider. AI assistants asked open-ended
            (we cannot pass them a 200,000-strong reference list). Image-similarity tools
            run against their indexed reference set.
          </p>
        </div>
      </section>

      {/* ================= Who it's for ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid mask-radial opacity-50 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-stone-900/5 border border-stone-900/10 text-stone-600 text-[11px] font-semibold tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-1 h-1 rounded-full bg-stone-600" />
              Where teams use it
            </div>
            <h2 className="text-3xl sm:text-[2.75rem] font-black text-stone-900 tracking-[-0.03em] leading-[1.05] text-balance">
              Clearance for <span className="text-gradient-red">film, gaming, and creative IP.</span>
            </h2>
            <p className="mt-4 text-stone-500 max-w-2xl mx-auto text-balance leading-relaxed">
              Legal and IP teams use MegaYours to clear new visual work against existing
              protected references — before the asset reaches production, marketing,
              or release.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <UseCaseCard
              icon="shield"
              title="Character & costume clearance"
              description="Pre-screen new characters and costumes against the catalog of protected film and TV IP."
            />
            <UseCaseCard
              icon="filter"
              title="Game asset clearance"
              description="Clear weapons, vehicles, props, and environments before they ship in a new title."
            />
            <UseCaseCard
              icon="search"
              title="Marketing & promo art"
              description="Check posters, key art, and campaign assets for unintentional likeness to protected works."
            />
            <UseCaseCard
              icon="check"
              title="AI-generated content review"
              description="Run AI-generated scenes and concepts through the same clearance check before they go out."
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
            See it on <span className="text-gradient-cream">your own work.</span>
          </h2>
          <p className="mt-5 text-white/55 max-w-lg mx-auto text-balance leading-relaxed">
            Send us a representative scene, character, or asset. We'll run a clearance
            check and walk you through the report.
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
              How a clearance check runs
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
            <span>· Visual Copyright Clearance</span>
          </div>
          <span className="tabular-nums">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}

/* ---------- stats data ---------- */
const STATS: { value: string; label: string; suffix?: string }[] = [
  { value: "200K", label: "Media & entertainment IPs indexed", suffix: "+" },
  { value: "100", label: "Law firms & IP holders consulted", suffix: "+" },
  { value: "75", label: "Hours of interviews with legal teams", suffix: "+" },
];

/* ---------- small bits ---------- */
function ArrowUp() {
  return <span className="inline-block text-white/25 font-mono ml-0.5">↑</span>;
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

// Known/unknown split table — populated from compare_vlm.py + compare_clip.py
// against a 50/50 mix of famous brands and obscure EUIPO marks (synthetic
// queries). F1 at the operating threshold each approach was tuned for.
type SplitRowData = {
  name: string;
  description: string;
  f1Known: number;
  f1Unknown: number;
  highlight?: boolean;
};

const SPLIT_ROWS: SplitRowData[] = [
  { name: "OpenAI CLIP", description: "Image-similarity AI — recognises what it has seen, blank on the rest", f1Known: 0.704, f1Unknown: 0.0 },
  { name: "Google SigLIP", description: "Image-similarity AI — same blind spot on lesser-known IP", f1Known: 0.609, f1Unknown: 0.0 },
  { name: "Gemini 2.5", description: "Names household IPs; on lesser-known marks with no readable text, returns nothing", f1Known: 0.962, f1Unknown: 0.05 },
  { name: "GPT-4.1", description: "Same pattern — strong on famous IPs, silent on lesser-known visual marks", f1Known: 0.872, f1Unknown: 0.04 },
  { name: "MegaYours (Light)", description: "Indexed-catalog matching alone — strong on lesser-known IP, weaker on stylised renditions", f1Known: 0.258, f1Unknown: 0.923 },
  { name: "MegaYours (Max)", description: "Catalog matching + AI review layer — first to cover both", f1Known: 0.981, f1Unknown: 0.976, highlight: true },
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

function SplitRow({ name, description, f1Known, f1Unknown, highlight }: SplitRowData) {
  const rowCls = highlight
    ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent"
    : "hover:bg-white/[0.02] transition-colors";
  const nameCls = highlight ? "text-emerald-200" : "text-white/85";
  const avgPct = Math.round(((f1Known + f1Unknown) / 2) * 100);
  return (
    <tr className={`${rowCls} border-t border-white/5`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          {highlight && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />}
          <div className={`text-sm font-semibold tracking-tight ${nameCls}`}>{name}</div>
        </div>
        <div className="text-xs text-white/40 mt-0.5">{description}</div>
      </td>
      <BenchmarkCell value={avgPct / 100} highlight={highlight} />
    </tr>
  );
}

const ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  type: "M4 6h16M4 12h8m-8 6h16",
};
