import { useEffect, useRef, useState, useMemo } from "react";
import type { Detection } from "../api";

const COLORS: Record<string, string> = {
  HIGH: "#00c800",
  MEDIUM: "#ffa500",
  LOW: "#c80000",
};

const COLORS_DIM: Record<string, string> = {
  HIGH: "rgba(0,200,0,0.2)",
  MEDIUM: "rgba(255,165,0,0.2)",
  LOW: "rgba(200,0,0,0.2)",
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
      <canvas ref={canvasRef} className="max-w-full h-auto rounded border border-gray-200" />

      {detections.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{selected.size} of {detections.length} selected</span>
            <div className="flex gap-2">
              <button onClick={() => setSelected(new Set(detections.map((_, i) => i)))} className="hover:text-gray-600">
                Select all
              </button>
              <button onClick={() => setSelected(new Set())} className="hover:text-gray-600">
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
                className={`rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "border-gray-300 bg-white shadow-sm"
                    : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                {/* Summary row */}
                <div className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span
                    className={`w-3 h-3 rounded-sm shrink-0 border-2 ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}
                  />
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[d.confidence] || "#ccc" }}
                  />
                  <span className="font-medium text-gray-900">{d.ip}</span>
                  <span className="text-gray-500">{(d.score * 100).toFixed(1)}%</span>
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${
                    d.confidence === "HIGH"
                      ? "bg-green-100 text-green-700"
                      : d.confidence === "MEDIUM"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                  }`}>
                    {d.confidence}
                  </span>
                </div>

                {/* Expanded detail */}
                {isSelected && (
                  <div className="px-3 pb-3 pt-0 space-y-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 pt-3">
                      {/* Score breakdown */}
                      <div className="space-y-2">
                        <ScoreBar label="DINOv2" value={d.dino_score} color="#6366f1" />
                        <ScoreBar label="CLIP" value={d.clip_score} color="#8b5cf6" />
                        <ScoreBar label="Combined" value={d.score} color={COLORS[d.confidence] || "#999"} />
                      </div>

                      {/* Bbox info */}
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="font-medium text-gray-700">Region</p>
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
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
      <p className="text-xs text-gray-500 mb-1 font-medium">Matched region</p>
      <canvas ref={canvasRef} className="rounded border border-gray-200 max-w-[200px]" />
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

    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.strokeRect(x, y, w, h);

    if (isSelected) {
      // Label background
      const label = `${d.ip} ${(d.score * 100).toFixed(1)}%`;
      ctx.font = "bold 14px sans-serif";
      const metrics = ctx.measureText(label);
      const labelH = 20;
      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelH, metrics.width + 8, labelH);

      // Label text
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, y - 5);
    }
  }
}
