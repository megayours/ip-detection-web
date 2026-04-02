import { useState, useEffect, useMemo } from "react";
import { listPublicTrademarks, submitDetection, type Trademark, type Detection } from "../api";
import { useJobPoller } from "../hooks/useJobPoller";
import ImageUploader from "../components/ImageUploader";
import DetectionResult from "../components/DetectionResult";

export default function Check() {
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const job = useJobPoller(jobId);
  const detections: Detection[] = useMemo(() => job?.result?.detections ?? [], [job]);

  useEffect(() => {
    listPublicTrademarks().then(({ trademarks }) => {
      setTrademarks(trademarks);
      if (trademarks.length > 0) setSelectedId(trademarks[0].id);
    });
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
    if (!file || !selectedId) return;
    setSubmitting(true);
    setError("");
    try {
      const { job_id } = await submitDetection(selectedId, file);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Check Image</h1>
      <p className="text-gray-500 text-sm">
        Upload an image and select a trademark to check for visual similarity.
      </p>

      {/* Trademark selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Trademark to check against</label>
        {trademarks.length === 0 ? (
          <p className="text-sm text-gray-400">No indexed trademarks available yet.</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {trademarks.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name} ({tm.image_count} images)
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
          label="Drop an image to check, or click to browse"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{file.name}</span>
            <button onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>

          {/* Show results or preview */}
          {job?.status === "completed" && previewUrl ? (
            <DetectionResult imageUrl={previewUrl} detections={detections} />
          ) : previewUrl ? (
            <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded border border-gray-200" />
          ) : null}

          {/* Status messages */}
          {isProcessing && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3">
              Processing ({job.status})... This may take a moment.
            </div>
          )}

          {job?.status === "failed" && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              Detection failed: {job.error}
            </div>
          )}

          {job?.status === "completed" && detections.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm rounded-lg px-4 py-3">
              No matches found for this trademark.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Submit button */}
          {(!job || job.status === "completed" || job.status === "failed") && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedId}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : job ? "Run Again" : "Check Image"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
