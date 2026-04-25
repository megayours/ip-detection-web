import { useState, useEffect, useRef } from "react";
import ImageUploader from "../components/ImageUploader";
import { submitClearance, getClearanceResult, type ClearanceResult } from "../api";

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
  // Click a sidebar card to focus on one IP; click again (or outside) to clear.
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

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
    try {
      const { job_id } = await submitClearance(f);
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setJobId(null);
    setResult(null);
    setError(null);
    setSelectedIp(null);
    clearInterval(timerRef.current);
  }

  const isProcessing = !!jobId && (!result || result.status === "pending");
  const isDone = result?.status === "complete";
  const matches = result?.matches ?? [];

  const ipColorMap = new Map<string, string>();
  matches.forEach((m) => {
    if (!ipColorMap.has(m.ip_name)) {
      ipColorMap.set(m.ip_name, MATCH_COLORS[ipColorMap.size % MATCH_COLORS.length]);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Clearance</h1>
          <p className="text-xs text-stone-400 mt-0.5">Pre-screen images for IP conflicts</p>
        </div>
        {file && (
          <button
            onClick={reset}
            className="px-3 py-1 text-xs font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Check another
          </button>
        )}
      </div>

      {!file && (
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label="Drop an image to check for IP conflicts"
        />
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {isProcessing && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-stone-500">Analyzing...</p>
        </div>
      )}

      {isDone && (
        <div className="space-y-4">
          {/* Verdict banner */}
          {matches.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-emerald-700">All Clear — no IP conflicts detected</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-sm font-medium text-red-700">
                {matches.length} match{matches.length === 1 ? "" : "es"} across {ipColorMap.size} IP{ipColorMap.size === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {/* Two-column layout: image left, matches right */}
          <div className="flex gap-4 items-start">
            {/* Image with bbox overlay — constrained height */}
            <div className="flex-1 min-w-0 border border-stone-200 rounded-xl overflow-hidden bg-white">
              <div className="relative max-h-[60vh] flex items-center justify-center bg-stone-50">
                <img
                  src={result!.query_image_url}
                  alt="Checked"
                  className="block max-h-[60vh] max-w-full h-auto w-auto object-contain"
                />
                {matches.length > 0 && result!.image_width && result!.image_height && (
                  <svg
                    viewBox={`0 0 ${result!.image_width} ${result!.image_height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {/* Soft radial-gradient halos. Coarse spatial cue — no
                        false precision. Selected IP renders at full opacity;
                        others fade to a faint hint until selected. */}
                    <defs>
                      {Array.from(ipColorMap.entries()).map(([ipName, color]) => (
                        <radialGradient key={ipName} id={`halo-${ipName.replace(/[^a-zA-Z0-9]/g, "_")}`} cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                          <stop offset="55%" stopColor={color} stopOpacity="0.20" />
                          <stop offset="100%" stopColor={color} stopOpacity="0" />
                        </radialGradient>
                      ))}
                    </defs>
                    {matches.map((m, i) => {
                      const isSelected = selectedIp === m.ip_name;
                      const isDimmed = selectedIp !== null && !isSelected;
                      const opacity = isDimmed ? 0.10 : (isSelected ? 1.0 : 0.55);
                      // Halo center = bbox center; radius = ~larger half-dimension
                      // of the coarse region cell (regions are 1/3 of the image).
                      const cx = m.bbox[0] + m.bbox[2] / 2;
                      const cy = m.bbox[1] + m.bbox[3] / 2;
                      const r = Math.max(m.bbox[2], m.bbox[3]) * 0.62;
                      const fontSize = Math.max(result!.image_width! / 50, 14);
                      const gradientId = `halo-${m.ip_name.replace(/[^a-zA-Z0-9]/g, "_")}`;
                      const showLabel = isSelected || (!selectedIp && matches.length <= 6);
                      return (
                        <g key={i} opacity={opacity}>
                          <circle cx={cx} cy={cy} r={r} fill={`url(#${gradientId})`} />
                          {showLabel && (
                            <>
                              <rect
                                x={cx - fontSize * m.ip_name.length * 0.30 - 8}
                                y={cy - fontSize * 0.9}
                                width={fontSize * m.ip_name.length * 0.60 + 16}
                                height={fontSize * 1.6}
                                fill="rgba(15, 15, 15, 0.85)"
                                rx={fontSize * 0.4}
                              />
                              <text
                                x={cx} y={cy + fontSize * 0.35}
                                fill="#fff" fontSize={fontSize}
                                fontWeight="600" textAnchor="middle"
                                fontFamily="Inter, system-ui, sans-serif"
                              >
                                {m.ip_name}
                              </text>
                            </>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>

            {/* Match list — compact cards; click to filter overlay */}
            {matches.length > 0 && (
              <div className="w-72 shrink-0 space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedIp && (
                  <button
                    onClick={() => setSelectedIp(null)}
                    className="w-full text-xs font-medium text-stone-500 hover:text-stone-900 py-1 transition-colors"
                  >
                    ← Show all
                  </button>
                )}
                {Array.from(ipColorMap.entries()).map(([ipName, color]) => {
                  const ipMatches = matches.filter((m) => m.ip_name === ipName);
                  const best = ipMatches.reduce((a, b) => a.score > b.score ? a : b);
                  const isSelected = selectedIp === ipName;
                  const isDimmed = selectedIp !== null && !isSelected;
                  return (
                    <button
                      key={ipName}
                      type="button"
                      onClick={() => setSelectedIp(isSelected ? null : ipName)}
                      className={`w-full text-left border rounded-xl bg-white p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-stone-900 shadow-md"
                          : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
                      } ${isDimmed ? "opacity-40" : ""}`}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${color}33` } : undefined}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-bold text-stone-900 truncate">{ipName}</span>
                        <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                          best.score >= 0.75 ? "bg-red-50 text-red-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {(best.score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2 flex-wrap">
                        <span>{best.confidence}</span>
                        <span>&middot;</span>
                        <span>{best.method}</span>
                        {best.region && best.region !== "full-image" && (
                          <>
                            <span>&middot;</span>
                            <span className="font-medium text-stone-500">{best.region.replace("-", " ")}</span>
                          </>
                        )}
                        {ipMatches.length > 1 && (
                          <>
                            <span>&middot;</span>
                            <span>{ipMatches.length} regions</span>
                          </>
                        )}
                      </div>
                      {best.justification && (
                        <p className="text-xs text-stone-600 mb-2 leading-snug line-clamp-2">
                          {best.justification}
                        </p>
                      )}
                      {best.closest_ref_url && (
                        <div className="flex gap-1.5">
                          <div className="border border-stone-100 rounded-lg overflow-hidden bg-stone-50 w-16 h-16 shrink-0">
                            <img src={best.closest_ref_url} alt="" className="w-full h-full object-contain" />
                          </div>
                          {best.reference_images
                            .filter((r) => r.image_url !== best.closest_ref_url)
                            .slice(0, 3)
                            .map((ref) => (
                              <div key={ref.id} className="border border-stone-100 rounded-lg overflow-hidden bg-stone-50 w-16 h-16 shrink-0">
                                <img src={ref.image_url} alt="" className="w-full h-full object-contain" />
                              </div>
                            ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
