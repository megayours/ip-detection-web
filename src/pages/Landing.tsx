import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Decorative blurs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <div className="inline-block bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
            Visual IP Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] max-w-3xl">
            The{" "}
            <span className="bg-gradient-to-r from-rose-400 to-amber-400 bg-clip-text text-transparent">
              Credit Score
            </span>{" "}
            for Visual IP
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl leading-relaxed">
            Every AI-generated image carries hidden IP risk. MegaYours detects, scores, and surfaces
            intellectual property proximity in visual content — turning liability into clarity.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            {user ? (
              <>
                <Link
                  to="/check"
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-500/25"
                >
                  Scan an Image
                </Link>
                <Link
                  to="/trademarks"
                  className="px-6 py-3 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/15 transition-all border border-white/10"
                >
                  IP Registry
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-500/25"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: "$150B+", label: "IP Services Market" },
              { value: "70+", label: "Pending AI Suits" },
              { value: "<10s", label: "Scan Latency" },
              { value: "0.75+", label: "High Confidence" },
            ].map(({ value, label }) => (
              <div key={label} className="border-t border-white/10 pt-4">
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          How the <span className="text-rose-500">Technology</span> Works
        </h2>
        <p className="mt-3 text-slate-500 max-w-2xl">
          A dual-model AI engine that detects IP at the semantic level — not just pixel-matching.
        </p>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card
            step="01"
            title="Register IP"
            description="Upload reference images of your trademark. The engine extracts neural embeddings that capture visual structure and semantic identity."
          />
          <Card
            step="02"
            title="Index & Score"
            description="DINOv2 captures shape and pose. CLIP captures meaning. Together they compute centroid embeddings that define your IP's unique visual signature."
          />
          <Card
            step="03"
            title="Detect & Report"
            description="Upload any image. A multi-scale sliding window scans for matches. Results include bounding boxes, confidence scores, and a breakdown by model."
          />
        </div>
      </section>

      {/* Tech highlight */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Semantic Detection,<br />Not Pixel Matching
              </h2>
              <p className="mt-4 text-slate-500 leading-relaxed">
                Traditional tools rely on perceptual hashing — they check if two images are pixel-identical.
                When a diffusion model produces something <em>stylistically similar</em> to protected IP
                but shares no pixels with the original, hash-based tools see nothing.
              </p>
              <p className="mt-3 text-slate-500 leading-relaxed">
                MegaYours sees the IP. Our dual-model approach combines structural analysis (DINOv2) with
                semantic understanding (CLIP) to catch both visual derivatives and conceptual reproductions.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <ModelRow
                name="DINOv2"
                weight="70%"
                description="Visual structure — shapes, poses, spatial composition"
                color="from-indigo-500 to-violet-500"
              />
              <ModelRow
                name="CLIP"
                weight="30%"
                description="Semantic meaning — concept identity, brand association"
                color="from-violet-500 to-purple-500"
              />
              <div className="pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Confidence Levels</div>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> HIGH &ge; 0.75
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> MEDIUM &ge; 0.60
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> LOW &lt; 0.60
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Ready to scan?
        </h2>
        <p className="mt-3 text-slate-500 max-w-lg mx-auto">
          Register your IP, upload an image, and get a proximity score in seconds.
          No credit card. No setup. Just passkey authentication.
        </p>
        <div className="mt-8">
          <Link
            to={user ? "/check" : "/login"}
            className="inline-block px-8 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-lg text-sm font-semibold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-500/25"
          >
            {user ? "Scan an Image" : "Get Started"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-slate-400">
          <span>MegaYours</span>
          <span>Visual IP Intelligence Platform</span>
        </div>
      </footer>
    </div>
  );
}

function Card({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-100 transition-all">
      <div className="absolute top-5 right-5 text-5xl font-black text-slate-50 group-hover:text-slate-100 transition-colors">
        {step}
      </div>
      <div className="relative">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ModelRow({ name, weight, description, color }: { name: string; weight: string; description: string; color: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
        <span className="text-white text-xs font-bold">{weight}</span>
      </div>
      <div>
        <div className="font-semibold text-slate-900 text-sm">{name}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
    </div>
  );
}
