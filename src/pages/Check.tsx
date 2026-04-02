import { useState, useEffect, useMemo } from "react";
import { listPublicTrademarks, submitDetection, type Trademark, type Detection } from "../api";
import { useJobPoller } from "../hooks/useJobPoller";
import ImageUploader from "../components/ImageUploader";
import DetectionResult from "../components/DetectionResult";

const ALL_TRADEMARKS = "__all__";

export default function Check() {
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [selectedId, setSelectedId] = useState(ALL_TRADEMARKS);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const job = useJobPoller(jobId);
  const detections: Detection[] = useMemo(() => job?.result?.detections ?? [], [job]);

  useEffect(() => {
    listPublicTrademarks().then(({ trademarks }) => setTrademarks(trademarks));
  }, []);

  function handleFile(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setJobId(null);
    setError("");
  }

  async function handleSubmit() {
    if (!file) return;
    setSubmitting(true);
    setError("");
    try {
      const tmId = selectedId === ALL_TRADEMARKS ? undefined : selectedId;
      const { job_id } = await submitDetection(file, tmId);
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setFile(null);
    setPreviewUrl(null);
    setJobId(null);
    setError("");
  }

  const isProcessing = job && job.status !== "completed" && job.status !== "failed";
  const selectedLabel = selectedId === ALL_TRADEMARKS
    ? `all ${trademarks.length} trademarks`
    : trademarks.find((t) => t.id === selectedId)?.name ?? "selected trademark";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scan Image</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload an image to check for visual IP proximity against registered trademarks.
        </p>
      </div>

      {/* Trademark selector */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Check against</label>
        {trademarks.length === 0 ? (
          <div className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            No indexed trademarks available yet. Register and index IP first.
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white transition-all"
          >
            <option value={ALL_TRADEMARKS}>
              All Trademarks ({trademarks.length})
            </option>
            {trademarks.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} ({tm.image_count} references)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Upload / preview */}
      {!file ? (
        <ImageUploader
          onUpload={handleFile}
          multiple={false}
          label="Drop an image to scan, or click to browse"
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 font-medium">{file.name}</span>
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Clear
            </button>
          </div>

          {/* Results or preview */}
          {job?.status === "completed" && previewUrl ? (
            <DetectionResult imageUrl={previewUrl} detections={detections} />
          ) : previewUrl ? (
            <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-xl border border-slate-200" />
          ) : null}

          {/* Processing state */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Scanning against {selectedLabel}...
            </div>
          )}

          {job?.status === "failed" && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
              Scan failed: {job.error}
            </div>
          )}

          {job?.status === "completed" && detections.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-5 py-4">
              No IP proximity detected against {selectedLabel}. Image appears clear.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
              {error}
            </div>
          )}

          {/* Submit */}
          {(!job || job.status === "completed" || job.status === "failed") && (
            <button
              onClick={handleSubmit}
              disabled={submitting || trademarks.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
            >
              {submitting ? "Submitting..." : job ? "Scan Again" : "Scan Image"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
