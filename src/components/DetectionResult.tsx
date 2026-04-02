import { useEffect, useRef, useState, useMemo } from "react";
import type { Detection } from "../api";

const COLORS: Record<string, string> = {
  HIGH: "#10b981",
  MEDIUM: "#f59e0b",
  LOW: "#ef4444",
};

const METHOD_LABELS: Record<string, string> = {
  visual: "Visual",
  text: "OCR",
  template: "Template",
  sift: "SIFT",
};

interface IPGroup {
  name: string;
  bestScore: number;
  confidence: string;
  detections: Detection[];
  methods: string[];
}

interface Props {
  imageUrl: string;
  detections: Detection[];
}

export default function DetectionResult({ imageUrl, detections }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [expandedIP, setExpandedIP] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Group detections by IP
  const groups: IPGroup[] = useMemo(() => {
    const map = new Map<string, Detection[]>();
    for (const d of detections) {
      const list = map.get(d.ip) || [];
      list.push(d);
      map.set(d.ip, list);
    }
    return Array.from(map.entries()).map(([name, dets]) => {
      const sorted = [...dets].sort((a, b) => b.score - a.score);
      const best = sorted[0];
      const methods = [...new Set(sorted.map(d => d.method || "visual"))];
      return { name, bestScore: best.score, confidence: best.confidence, detections: sorted, methods };
    }).sort((a, b) => b.bestScore - a.bestScore);
  }, [detections]);

  // Which detections to draw on canvas: best per IP, or all for expanded IP
  const visibleDetections = useMemo(() => {
    if (expandedIP) {
      return groups.find(g => g.name === expandedIP)?.detections || [];
    }
    // Best detection per IP
    return groups.map(g => g.detections[0]);
  }, [groups, expandedIP]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      draw(canvas, img, visibleDetections, expandedIdx);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    draw(canvas, imgRef.current, visibleDetections, expandedIdx);
  }, [visibleDetections, expandedIdx]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-xl border border-slate-200" />

      {groups.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">{groups.length} trademark{groups.length !== 1 ? "s" : ""} detected</p>

          {groups.map((group) => {
            const isExpanded = expandedIP === group.name;

            return (
              <div key={group.name} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                {/* IP Summary */}
                <button
                  onClick={() => { setExpandedIP(isExpanded ? null : group.name); setExpandedIdx(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-left hover:bg-slate-50/50 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[group.confidence] || "#ccc" }} />
                  <span className="font-semibold text-slate-900">{group.name}</span>
                  <span className="text-slate-500 text-lg font-bold">{(group.bestScore * 100).toFixed(0)}%</span>
                  <div className="flex gap-1.5 ml-1">
                    {group.methods.map(m => (
                      <span key={m} className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {METHOD_LABELS[m] || m}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-slate-400">{group.detections.length} hit{group.detections.length !== 1 ? "s" : ""}</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      group.confidence === "HIGH" ? "bg-emerald-50 text-emerald-600"
                      : group.confidence === "MEDIUM" ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-600"
                    }`}>
                      {group.confidence}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {/* Expanded: individual detections */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {group.detections.map((d, i) => {
                      const isDetailOpen = expandedIdx === i;
                      const [x, y, w, h] = d.bbox;

                      return (
                        <div key={i} className="border-b border-slate-50 last:border-b-0">
                          <button
                            onClick={() => setExpandedIdx(isDetailOpen ? null : i)}
                            onMouseEnter={() => setExpandedIdx(i)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-left hover:bg-slate-50/30 transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[d.confidence] || "#ccc" }} />
                            <span className="text-slate-600 font-medium">{(d.score * 100).toFixed(1)}%</span>
                            <span className="text-slate-400">
                              {METHOD_LABELS[d.method || "visual"]}
                            </span>
                            {d.text_found && <span className="text-slate-400 font-mono">"{d.text_found}"</span>}
                            <span className="ml-auto text-slate-300">{w}x{h} at ({x},{y})</span>
                          </button>

                          {isDetailOpen && (
                            <div className="px-4 pb-3 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  {d.method === "visual" && (
                                    <>
                                      <ScoreBar label="DINOv2" value={d.dino_score} color="#6366f1" />
                                      <ScoreBar label="CLIP" value={d.clip_score} color="#8b5cf6" />
                                    </>
                                  )}
                                  {d.method === "text" && <ScoreBar label="Text similarity" value={d.score} color="#6366f1" />}
                                  {d.method === "template" && <ScoreBar label="Correlation" value={d.score} color="#06b6d4" />}
                                  <ScoreBar label="Final" value={d.score} color={COLORS[d.confidence] || "#999"} />
                                </div>
                                <CropPreview imageUrl={imageUrl} bbox={d.bbox} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-700">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function CropPreview({ imageUrl, bbox }: { imageUrl: string; bbox: [number, number, number, number] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const [x, y, w, h] = bbox;
      const maxW = 160;
      const scale = Math.min(maxW / w, maxW / h, 1);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl, bbox]);

  return <canvas ref={canvasRef} className="rounded border border-slate-200 max-w-[160px]" />;
}

function draw(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  detections: Detection[],
  highlightIdx: number | null,
) {
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  for (let i = 0; i < detections.length; i++) {
    const d = detections[i];
    const [x, y, w, h] = d.bbox;
    const isHighlighted = highlightIdx === null || highlightIdx === i;

    const color = COLORS[d.confidence] || "#ccc";
    const isNonVisual = d.method && d.method !== "visual";

    ctx.globalAlpha = isHighlighted ? 1 : 0.25;
    ctx.strokeStyle = color;
    ctx.lineWidth = isHighlighted ? 3 : 1;

    if (isNonVisual) ctx.setLineDash([6, 4]);
    else ctx.setLineDash([]);

    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    if (isHighlighted) {
      const label = `${d.ip} ${(d.score * 100).toFixed(0)}%`;
      ctx.font = "bold 14px sans-serif";
      const metrics = ctx.measureText(label);
      const labelH = 20;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelH, metrics.width + 8, labelH);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, y - 5);
    }
  }
  ctx.globalAlpha = 1;
}
