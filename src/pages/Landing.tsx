import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 pt-24 lg:pt-32 pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-block bg-stone-900/5 border border-stone-900/10 text-stone-600 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
              Visual IP Intelligence
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-stone-900">
              The{" "}
              <span className="text-amber-600">
                Credit Score
              </span>{" "}
              for Visual IP
            </h1>
            <p className="mt-6 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
              Every AI-generated image carries hidden IP risk. MegaYours detects, scores, and surfaces
              intellectual property proximity in visual content — turning liability into clarity.
            </p>
            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              {user ? (
                <>
                  <Link
                    to="/test"
                    className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-all"
                  >
                    Get Brand Approval
                  </Link>
                  <Link
                    to="/check"
                    className="px-6 py-3 border border-stone-300 text-stone-700 rounded-full text-sm font-semibold hover:bg-stone-50 transition-all"
                  >
                    Scan an Image
                  </Link>
                  <Link
                    to="/registry"
                    className="px-6 py-3 border border-stone-300 text-stone-700 rounded-full text-sm font-semibold hover:bg-stone-50 transition-all"
                  >
                    IP Registry
                  </Link>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-all"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "$150B+", label: "IP Services Market" },
            { value: "70+", label: "Pending AI Suits" },
            { value: "<10s", label: "Scan Latency" },
            { value: "0.75+", label: "High Confidence" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-stone-200 p-6">
              <div className="text-3xl sm:text-4xl font-black text-stone-900">{value}</div>
              <div className="text-xs text-stone-400 uppercase tracking-wider mt-2 font-semibold">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
              How it works
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              How the Technology Works
            </h2>
            <p className="mt-3 text-white/50 max-w-2xl mx-auto">
              A proprietary multi-stage pipeline that detects IP at the semantic level — not just pixel-matching.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card
              step="01"
              title="Register IP"
              description="Upload reference images of your IP. Our pipeline extracts a unique visual fingerprint that captures both structure and meaning."
            />
            <Card
              step="02"
              title="Index & Analyze"
              description="Multiple detection algorithms work in concert — machine vision, template analysis, and text recognition — to build a comprehensive IP signature."
            />
            <Card
              step="03"
              title="Detect & Report"
              description="Upload any image and get a proximity score in seconds. Results include matched regions, confidence levels, and a breakdown by detection method."
            />
          </div>
        </div>
      </section>

      {/* Tech highlight */}
      <section className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">
                Multi-Stage Detection,<br />Not Pixel Matching
              </h2>
              <p className="mt-4 text-stone-500 leading-relaxed">
                Traditional tools rely on perceptual hashing — they check if two images are pixel-identical.
                When a diffusion model produces something <em>stylistically similar</em> to protected IP
                but shares no pixels with the original, hash-based tools see nothing.
              </p>
              <p className="mt-3 text-stone-500 leading-relaxed">
                MegaYours sees the IP. Our multi-stage pipeline combines structural analysis with
                semantic understanding, template matching, and optical character recognition to catch
                visual derivatives, logo placements, and text-based marks across any context.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <PipelineRow
                icon="eye"
                title="Structural Analysis"
                description="Visual structure — shapes, spatial composition, character anatomy"
              />
              <PipelineRow
                icon="brain"
                title="Semantic Understanding"
                description="Concept identity — brand association, character recognition, style analysis"
              />
              <PipelineRow
                icon="scan"
                title="Template Matching"
                description="Direct visual comparison — logo detection across scales and orientations"
              />
              <PipelineRow
                icon="type"
                title="Text Recognition"
                description="Optical character recognition — word marks, brand names, typographic IP"
              />
              <div className="pt-4 border-t border-stone-100">
                <div className="text-xs text-stone-400 uppercase tracking-wider mb-2">Confidence Levels</div>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> HIGH
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> MEDIUM
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> LOW
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Licensee approval */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
                New · Licensee Self-Service
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight leading-tight">
                Get instant brand approval — <span className="text-emerald-600">before</span> you submit.
              </h2>
              <p className="mt-4 text-stone-600 leading-relaxed">
                Licensees, partners and creators can upload their designs and get an automated
                pre-flight check against the brand's guidelines in seconds. A passing result earns
                an approval certificate they can attach to the work — turning the back-and-forth
                of brand review into a one-click confirmation.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-stone-700">
                <Bullet>Upload a mockup, get a verdict in seconds</Bullet>
                <Bullet>Plain-English guideline checks — no spec interpretation</Bullet>
                <Bullet>Approval certificate on every passing submission</Bullet>
                <Bullet>Failed? See exactly which guideline didn't match, and why</Bullet>
              </ul>
              <div className="mt-8">
                <Link
                  to={user ? "/test" : "/login"}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full text-sm font-semibold hover:bg-emerald-700 transition-all"
                >
                  {user ? "Test a design now" : "Try it free"}
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Mock approval certificate */}
            <div className="relative">
              <div className="bg-white border-2 border-dashed border-emerald-300 rounded-2xl p-8 shadow-xl shadow-emerald-100/50 rotate-1">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 w-28 h-28 rounded-full border-4 border-emerald-600 text-emerald-700 flex items-center justify-center rotate-[-8deg]">
                    <div className="text-center leading-tight">
                      <div className="text-[10px] font-bold uppercase tracking-widest">Brand</div>
                      <div className="text-sm font-black uppercase">Approved</div>
                      <div className="text-[9px] mt-0.5 opacity-70">2026</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
                      Approval Certificate
                    </div>
                    <div className="mt-1 text-base font-black text-stone-900">
                      Cleared against brand guidelines
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      Spring 2026 collection · Donald Duck mockup #142
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <CheckRow label="IP Recognition" />
                      <CheckRow label="Visual Style Match" />
                      <CheckRow label="Reference Likeness" />
                      <CheckRow label="Brand Guideline Review" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                Verdict in &lt; 10s
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-black tracking-tight">
            Ready to scan?
          </h2>
          <p className="mt-3 text-white/50 max-w-lg mx-auto">
            Register your IP, upload an image, and get a proximity score in seconds.
            No credit card. No setup. Just passkey authentication.
          </p>
          <div className="mt-8">
            <Link
              to={user ? "/check" : "/login"}
              className="inline-block px-8 py-3 bg-white text-stone-900 rounded-full text-sm font-semibold hover:bg-stone-100 transition-all"
            >
              {user ? "Scan an Image" : "Get Started"}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-stone-400">
          <span>MegaYours</span>
          <span>Visual IP Intelligence Platform</span>
        </div>
      </footer>
    </div>
  );
}

function Card({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
      <div className="absolute top-5 right-5 text-5xl font-black text-white/5 group-hover:text-white/10 transition-colors">
        {step}
      </div>
      <div className="relative">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  type: "M4 6h16M4 12h8m-8 6h16",
};

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-stone-700">
      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">
        ✓
      </span>
      <span>{label}</span>
    </div>
  );
}

function PipelineRow({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
        <svg className="w-5 h-5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[icon]} />
        </svg>
      </div>
      <div>
        <div className="font-semibold text-stone-900 text-sm">{title}</div>
        <div className="text-xs text-stone-500">{description}</div>
      </div>
    </div>
  );
}
