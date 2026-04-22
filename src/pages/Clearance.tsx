import { useState, useEffect, useRef } from "react";
import ImageUploader from "../components/ImageUploader";
import { submitClearance, getClearanceResult, type ClearanceMatch, type ClearanceResult } from "../api";

const MATCH_COLORS = [
  "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4",
  "#10b981", "#ec4899", "#f97316", "#6366f1",
];

export default function Clearance() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ClearanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Poll for results
  useEffect(() => {
    if (!jobId) return;
    let active = true;

    async function poll() {
      try {
        const r = await getClearanceResult(jobId!);
        if (!active) return;
        setResult(r);
        if (r.status === "complete" || r.status === "failed") {
          clearInterval(timerRef.current);
          if (r.status === "failed") setError(r.error || "Analysis failed");
        }
      } catch {
        // ignore poll errors
      }
    }

    poll();
    timerRef.current = setInterval(poll, 1500);
    return () => { active = false; clearInterval(timerRef.current); };
  }, [jobId]);

  async function handleUpload(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const { job_id } = await submitClearance(f);
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setJobId(null);
    setResult(null);
    setError(null);
    setSubmitting(false);
    clearInterval(timerRef.current);
  }

  const isProcessing = jobId && (!result || result.status === "pending");
  const isDone = result?.status === "complete";
  const matches = result?.matches ?? [];

  // Build color map: unique IP names -> colors
  const ipColorMap = new Map<string, string>();
  matches.forEach((m) => {
    if (!ipColorMap.has(m.ip_name)) {
      ipColorMap.set(m.ip_name, MATCH_COLORS[ipColorMap.size % MATCH_COLORS.length]);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Clearance</h1>
        <p className="text-sm text-stone-500 mt-1">
          Pre-screen images for IP conflicts before publication
        </p>
      </div>

      {!file && (
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label="Drop an image to check for IP conflicts"
        />
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500 font-medium">Analyzing image against all registered IPs...</p>
        </div>
      )}

      {isDone && (
        <div className="mt-6 space-y-8">
          {/* Result header */}
          <div className="flex items-center justify-between">
            {matches.length === 0 ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-emerald-700">All Clear</p>
                  <p className="text-xs text-stone-500">No IP conflicts detected</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-bold text-stone-900">
                  {ipColorMap.size} IP{ipColorMap.size === 1 ? "" : "s"} detected
                </p>
                <p className="text-xs text-stone-500">
                  {matches.length} match{matches.length === 1 ? "" : "es"} across {ipColorMap.size} IP{ipColorMap.size === 1 ? "" : "s"}
                </p>
              </div>
            )}
            <button
              onClick={reset}
              className="px-4 py-1.5 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
            >
              Check another
            </button>
          </div>

          {/* Image with bbox overlay */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
            <div className="relative">
              <img
                src={result!.query_image_url}
                alt="Checked"
                className="block w-full h-auto"
              />
              {matches.length > 0 && result!.image_width && result!.image_height && (
                <svg
                  viewBox={`0 0 ${result!.image_width} ${result!.image_height}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {matches.map((m, i) => {
                    const color = ipColorMap.get(m.ip_name) || MATCH_COLORS[0];
                    const sw = Math.max(3, result!.image_width! / 200);
                    const labelH = Math.max(result!.image_width! / 30, 22);
                    const fontSize = Math.max(result!.image_width! / 55, 14);
                    const labelY = Math.max(0, m.bbox[1] - labelH);
                    const label = `${m.ip_name} ${(m.score * 100).toFixed(0)}%`;
                    // Estimate label width from character count
                    const labelW = Math.max(label.length * fontSize * 0.6 + 16, 80);
                    return (
                      <g key={i}>
                        <rect
                          x={m.bbox[0]} y={m.bbox[1]}
                          width={m.bbox[2]} height={m.bbox[3]}
                          fill="none" stroke={color} strokeWidth={sw}
                        />
                        <rect
                          x={m.bbox[0]} y={labelY}
                          width={labelW} height={labelH}
                          fill={color} rx={2}
                        />
                        <text
                          x={m.bbox[0] + 8}
                          y={labelY + fontSize + (labelH - fontSize) / 2}
                          fill="#fff"
                          fontSize={fontSize}
                          fontWeight="bold"
                          fontFamily="Inter, system-ui, sans-serif"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* Match cards */}
          {matches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Matches</h2>
              {/* Group by IP */}
              {Array.from(ipColorMap.entries()).map(([ipName, color]) => {
                const ipMatches = matches.filter((m) => m.ip_name === ipName);
                const bestMatch = ipMatches.reduce((a, b) => a.score > b.score ? a : b);
                return (
                  <div key={ipName} className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <h3 className="font-bold text-stone-900">{ipName}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          bestMatch.score >= 0.75 ? "bg-red-50 text-red-700" :
                          bestMatch.score >= 0.60 ? "bg-amber-50 text-amber-700" :
                          "bg-stone-50 text-stone-600"
                        }`}>
                          {(bestMatch.score * 100).toFixed(0)}% match
                        </span>
                        <span className="text-xs text-stone-400">
                          {bestMatch.confidence} confidence
                        </span>
                        {ipMatches.length > 1 && (
                          <span className="text-xs text-stone-400">
                            {ipMatches.length} regions
                          </span>
                        )}
                      </div>

                      {/* Side-by-side: closest ref */}
                      {bestMatch.closest_ref_url && (
                        <div className="flex gap-4 mt-3">
                          <div className="flex-1">
                            <p className="text-xs text-stone-400 mb-2 font-medium">Closest reference</p>
                            <div className="border border-stone-100 rounded-xl overflow-hidden bg-stone-50">
                              <img
                                src={bestMatch.closest_ref_url}
                                alt={`${ipName} reference`}
                                className="w-full h-40 object-contain"
                              />
                            </div>
                          </div>
                          {bestMatch.reference_images.length > 1 && (
                            <div className="flex-1">
                              <p className="text-xs text-stone-400 mb-2 font-medium">Other references</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                {bestMatch.reference_images
                                  .filter((r) => r.image_url !== bestMatch.closest_ref_url)
                                  .slice(0, 6)
                                  .map((ref) => (
                                    <div key={ref.id} className="border border-stone-100 rounded-lg overflow-hidden bg-stone-50 aspect-square">
                                      <img src={ref.image_url} alt="" className="w-full h-full object-contain" />
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
