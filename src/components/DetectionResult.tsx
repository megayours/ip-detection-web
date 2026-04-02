import { useEffect, useRef, useState, useMemo } from "react";
import type { Detection } from "../api";

const COLORS: Record<string, string> = {
  HIGH: "#10b981",
  MEDIUM: "#f59e0b",
  LOW: "#ef4444",
};

const COLORS_DIM: Record<string, string> = {
  HIGH: "rgba(16,185,129,0.2)",
  MEDIUM: "rgba(245,158,11,0.2)",
  LOW: "rgba(239,68,68,0.2)",
};

interface Props {
  imageUrl: string;
  detections: Detection[];
}

export default function DetectionResult({ imageUrl, detections }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(detections.map((_, i) => i)));

  // Reset selection when detections change
  useEffect(() => {
    setSelected(new Set(detections.map((_, i) => i)));
  }, [detections]);

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // Draw canvas whenever selection or image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      draw(canvas, img, detections, selected);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    draw(canvas, imgRef.current, detections, selected);
  }, [selected, detections]);

  // Compute image area for percentage calc
  const imageArea = useMemo(() => {
    if (!imgRef.current) return 0;
    return imgRef.current.naturalWidth * imgRef.current.naturalHeight;
  }, [imgRef.current]);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-xl border border-slate-200" />

      {detections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{selected.size} of {detections.length} selected</span>
            <div className="flex gap-3">
              <button onClick={() => setSelected(new Set(detections.map((_, i) => i)))} className="hover:text-slate-600 transition-colors">
                Select all
              </button>
              <button onClick={() => setSelected(new Set())} className="hover:text-slate-600 transition-colors">
                Clear
              </button>
            </div>
          </div>

          {detections.map((d, i) => {
            const isSelected = selected.has(i);
            const [x, y, w, h] = d.bbox;
            const areaPct = imageArea > 0 ? ((w * h) / imageArea * 100) : 0;

            return (
              <div
                key={i}
                onClick={() => toggle(i)}
                className={`rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-200 bg-white shadow-sm"
                    : "border-slate-100 bg-slate-50/50 opacity-60"
                }`}
              >
                {/* Summary row */}
                <div className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span
                    className={`w-3 h-3 rounded shrink-0 border-2 transition-colors ${isSelected ? "border-rose-500 bg-rose-500" : "border-slate-300"}`}
                  />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[d.confidence] || "#ccc" }}
                  />
                  <span className="font-semibold text-slate-900">{d.ip}</span>
                  {d.method === "text" && (
                    <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">OCR</span>
                  )}
                  <span className="text-slate-500">{(d.score * 100).toFixed(1)}%</span>
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    d.confidence === "HIGH"
                      ? "bg-emerald-50 text-emerald-600"
                      : d.confidence === "MEDIUM"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-red-50 text-red-600"
                  }`}>
                    {d.confidence}
                  </span>
                </div>

                {/* Expanded detail */}
                {isSelected && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-slate-100">
                    {d.text_found && (
                      <div className="pt-3">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Text found</span>
                        <p className="mt-1 text-sm font-mono font-semibold text-slate-800">"{d.text_found}"</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-3">
                      {/* Score breakdown */}
                      <div className="space-y-2">
                        {d.method !== "text" && (
                          <>
                            <ScoreBar label="DINOv2" value={d.dino_score} color="#6366f1" />
                            <ScoreBar label="CLIP" value={d.clip_score} color="#8b5cf6" />
                          </>
                        )}
                        {d.method === "text" && (
                          <ScoreBar label="Text similarity" value={d.score} color="#6366f1" />
                        )}
                        <ScoreBar label={d.method === "text" ? "Final" : "Combined"} value={d.score} color={COLORS[d.confidence] || "#999"} />
                      </div>

                      {/* Bbox info */}
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="font-medium text-slate-700">Region</p>
                        <p>Position: ({x}, {y})</p>
                        <p>Size: {w} x {h} px</p>
                        <p>Area: {areaPct.toFixed(1)}% of image</p>
                      </div>
                    </div>

                    {/* Crop preview */}
                    <CropPreview imageUrl={imageUrl} bbox={d.bbox} />
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
      const maxW = 200;
      const scale = Math.min(maxW / w, maxW / h, 1);
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
    };
    img.src = imageUrl;
  }, [imageUrl, bbox]);

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1 font-medium">Matched region</p>
      <canvas ref={canvasRef} className="rounded border border-slate-200 max-w-[200px]" />
    </div>
  );
}

function draw(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  detections: Detection[],
  selected: Set<number>,
) {
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  for (let i = 0; i < detections.length; i++) {
    const d = detections[i];
    const [x, y, w, h] = d.bbox;
    const isSelected = selected.has(i);

    const color = isSelected ? (COLORS[d.confidence] || "#ccc") : (COLORS_DIM[d.confidence] || "rgba(200,200,200,0.2)");

    const isText = d.method === "text";

    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 1;

    if (isText && isSelected) {
      // Dashed line for text detections
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    if (isSelected) {
      const prefix = isText ? "TXT " : "";
      const label = `${prefix}${d.ip} ${(d.score * 100).toFixed(1)}%`;
      ctx.font = "bold 14px sans-serif";
      const metrics = ctx.measureText(label);
      const labelH = 20;
      ctx.fillStyle = isText ? "#6366f1" : color;
      ctx.fillRect(x, y - labelH, metrics.width + 8, labelH);

      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, y - 5);
    }
  }
}
