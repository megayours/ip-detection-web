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
              <span className="text-amber-600">Similarity Scoring</span>
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

      {/* How the scoring works */}
      <section id="how-it-works" className="bg-stone-900 text-white scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-block bg-white/10 text-white/70 text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full mb-4">
              The Algorithm
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              How the Scoring Works
            </h2>
            <p className="mt-3 text-white/50 max-w-2xl mx-auto">
              Three steps from raw images to a semantic similarity score.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card
              step="01"
              title="Upload References"
              description="Provide reference images. The pipeline extracts a multi-dimensional visual fingerprint that captures both structure and meaning."
            />
            <Card
              step="02"
              title="Index & Embed"
              description="Multiple algorithms work in concert — structural analysis, semantic understanding, template matching, and OCR — to build a comprehensive signature."
            />
            <Card
              step="03"
              title="Score & Report"
              description="Submit any image and get a similarity score in seconds. Results include per-stage confidence, matched regions, and a breakdown by detection method."
            />
          </div>
        </div>
      </section>

      {/* Pipeline detail */}
      <section className="border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">
                Semantic Similarity,<br />Not Pixel Matching
              </h2>
              <p className="mt-4 text-stone-500 leading-relaxed">
                Traditional tools rely on perceptual hashing — they check if two images are pixel-identical.
                When an image is <em>conceptually similar</em> but shares no pixels with the reference,
                hash-based tools see nothing.
              </p>
              <p className="mt-3 text-stone-500 leading-relaxed">
                Our multi-stage pipeline combines structural analysis with semantic understanding,
                template matching, and optical character recognition to detect visual similarity
                across contexts, styles, and transformations.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <PipelineRow
                icon="eye"
                title="Structural Analysis"
                description="Visual structure — shapes, spatial composition, distinctive anatomy"
              />
              <PipelineRow
                icon="brain"
                title="Semantic Understanding"
                description="Concept identity — associations, recognition, style fingerprinting"
              />
              <PipelineRow
                icon="scan"
                title="Template Matching"
                description="Direct visual comparison — detection across scales and orientations"
              />
              <PipelineRow
                icon="type"
                title="Text Recognition"
                description="Optical character recognition — word marks, names, typographic elements"
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

const ICONS: Record<string, string> = {
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  brain: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  scan: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  type: "M4 6h16M4 12h8m-8 6h16",
};

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
