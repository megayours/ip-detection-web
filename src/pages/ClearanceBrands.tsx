import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ImageUploader from "../components/ImageUploader";
import { submitClearance, getClearanceResult, type ClearanceResult, type ClearanceMatch } from "../api";

const MATCH_COLORS = [
  "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4",
  "#10b981", "#ec4899", "#f97316", "#6366f1",
];

// Hybrid-mode badge: surfaces which pipelines (DINOv3 embedding vs Gemini VLM)
// found a given match. Cross-corroboration ("VLM + embedding") is the strongest
// signal; VLM-only with no trademark_id flags brands the catalog doesn't cover.
function evidenceBadge(m: ClearanceMatch): { label: string; cls: string } | null {
  const ev = m.evidence ?? [];
  if (ev.length === 0) return null;
  const hasEmbed = ev.includes("embedding");
  const hasVlm = ev.includes("vlm");
  const hasId = !!m.trademark_id;
  if (hasEmbed && hasVlm) return { label: "VLM + embedding", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (hasEmbed) return { label: "Embedding", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  if (hasVlm && !hasId) return { label: "VLM · unverified", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  if (hasVlm) return { label: "VLM", cls: "bg-violet-50 text-violet-700 border-violet-200" };
  return null;
}

export default function ClearanceBrands() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ClearanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Click a sidebar card to focus on one IP; click again (or outside) to clear.
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  // "Max mode" — checked = full hybrid (visual retrieval + VLM verification),
  // unchecked = v2-only (visual retrieval, skip VLM). Default-on so users get
  // the strongest pipeline unless they explicitly opt out.
  const [maxMode, setMaxMode] = useState(true);
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
      // Only send the override when Max mode is OFF — otherwise let the server
      // pick its default so we don't hard-code the prod mode in the client.
      const { job_id } = await submitClearance(f, maxMode ? undefined : { mode: "v2" });
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
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <Link
          to="/clearance/brands/catalog"
          className="text-xs font-medium text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
        >
          Browse all indexed trademarks
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
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
        <>
          <ImageUploader
            onUpload={handleUpload}
            multiple={false}
            label="Drop an image to check for IP conflicts"
          />
          <label className="mt-3 flex items-start gap-2 text-xs text-stone-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={maxMode}
              onChange={(e) => setMaxMode(e.target.checked)}
              className="mt-0.5 w-3.5 h-3.5 rounded border-stone-300 text-stone-900 focus:ring-1 focus:ring-stone-900 focus:ring-offset-0 cursor-pointer"
            />
            <span>
              <span className="font-medium text-stone-900">Max mode</span>
              <span className="ml-1 text-stone-500">
                — visual retrieval + VLM verification (slower, higher accuracy on
                well-known brands). Uncheck for v2 retrieval only.
              </span>
            </span>
          </label>
        </>
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
                    {/* Tight rectangle outlines around the VLM-detected bbox.
                        Double-stroked (white halo + colored core) so the box
                        stays visible against both light and dark backgrounds. */}
                    {matches.map((m, i) => {
                      const isSelected = selectedIp === m.ip_name;
                      const isDimmed = selectedIp !== null && !isSelected;
                      const opacity = isDimmed ? 0.15 : 1.0;
                      const color = ipColorMap.get(m.ip_name) || "#ef4444";
                      const [bx, by, bw, bh] = m.bbox;
                      const fontSize = Math.max(result!.image_width! / 60, 12);
                      const strokeWidth = Math.max(result!.image_width! / 400, 2);
                      const showLabel = isSelected || (!selectedIp && matches.length <= 8);
                      const labelW = fontSize * m.ip_name.length * 0.6 + 16;
                      const labelH = fontSize * 1.6;
                      // Anchor the label above the box; flip below if too close to top.
                      const labelY = by - labelH - 4 < 0 ? by + 4 : by - labelH - 4;
                      return (
                        <g key={i} opacity={opacity}>
                          {/* white halo behind the colored stroke for contrast */}
                          <rect
                            x={bx} y={by} width={bw} height={bh}
                            fill="none" stroke="#ffffff" strokeWidth={strokeWidth * 2}
                            strokeOpacity={0.85} rx={strokeWidth}
                          />
                          <rect
                            x={bx} y={by} width={bw} height={bh}
                            fill={color} fillOpacity={0.06}
                            stroke={color} strokeWidth={strokeWidth} rx={strokeWidth}
                          />
                          {showLabel && (
                            <>
                              <rect
                                x={bx} y={labelY}
                                width={labelW} height={labelH}
                                fill={color} rx={fontSize * 0.3}
                              />
                              <text
                                x={bx + 8} y={labelY + labelH * 0.7}
                                fill="#ffffff" fontSize={fontSize}
                                fontWeight="600" textAnchor="start"
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
                      {(() => {
                        const badge = evidenceBadge(best);
                        return badge ? (
                          <div className="mb-2">
                            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        ) : null;
                      })()}
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
