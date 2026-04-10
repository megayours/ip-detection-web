import { useState, useEffect, useRef } from "react";
import { listCases, submitScan, type Case } from "../api";
import { useJobPoller } from "../hooks/useJobPoller";
import ImageUploader from "../components/ImageUploader";
import CaseCard from "../components/CaseCard";

type InputMode = "file" | "url";
type ScopeMode = "own" | "all";

export default function Check() {
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [scope, setScope] = useState<ScopeMode>("own");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const job = useJobPoller(jobId);
  const isProcessing =
    !!jobId && (!job || (job.status !== "completed" && job.status !== "failed"));
  const isComplete = job?.status === "completed";

  // Poll cases?job_id=… while the scan is in flight, so the stepper updates
  // as the worker progressively writes case rows.
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    async function loadCases() {
      try {
        const r = await listCases({ job_id: jobId! });
        if (!cancelled) setCases(r.cases);
      } catch {
        /* ignore */
      }
    }
    loadCases();
    pollRef.current = setInterval(loadCases, 1500);
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId]);

  // Stop polling once job completes.
  useEffect(() => {
    if (isComplete && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      // Final refresh.
      if (jobId) listCases({ job_id: jobId }).then((r) => setCases(r.cases)).catch(() => {});
    }
  }, [isComplete, jobId]);

  function handleFile(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setJobId(null);
    setCases([]);
    setError("");
  }

  function handleReset() {
    setFile(null);
    setPreviewUrl(null);
    setImageUrl("");
    setJobId(null);
    setCases([]);
    setError("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");
    setCases([]);
    try {
      const opts =
        inputMode === "file"
          ? { file: file ?? undefined, mode: scope }
          : { imageUrl: imageUrl.trim(), mode: scope };
      if (inputMode === "file" && !file) throw new Error("Choose an image to scan.");
      if (inputMode === "url" && !imageUrl.trim())
        throw new Error("Paste an image URL to scan.");
      const { job_id } = await submitScan(opts);
      setJobId(job_id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    !isProcessing &&
    ((inputMode === "file" && !!file) || (inputMode === "url" && !!imageUrl.trim()));

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">Scan</h1>
        <p className="mt-1 text-sm text-stone-500">
          Run a single image — uploaded or pulled from a URL — through the cheap → expensive
          pipeline. Suspicious matches become persistent cases with full pipeline traces.
        </p>
      </div>

      {/* Input mode tabs */}
      <div className="space-y-3">
        <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-fit">
          {(["file", "url"] as InputMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setInputMode(m);
                setError("");
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                inputMode === m
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m === "file" ? "Upload file" : "Image URL"}
            </button>
          ))}
        </div>

        {inputMode === "file" ? (
          !file ? (
            <ImageUploader
              onUpload={handleFile}
              multiple={false}
              label="Drop an image to scan, or click to browse"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600 font-medium">{file.name}</span>
                <button
                  onClick={handleReset}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Clear
                </button>
              </div>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto rounded-xl border border-stone-200"
                />
              )}
            </div>
          )
        ) : (
          <div className="space-y-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://www.ebay.com/itm/.../image.jpg"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all"
            />
            <p className="text-xs text-stone-400">
              Paste a public image URL. The URL is recorded as the case source — this is the same
              entrypoint our future Monitor scrapers will use.
            </p>
          </div>
        )}
      </div>

      {/* Scope radio */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-stone-700">Scan against</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ScopeOption
            current={scope}
            value="own"
            label="My IPs"
            description="Sweep the IPs you've registered. Produces 0..N cases — one per suspiciously close match."
            onSelect={setScope}
          />
          <ScopeOption
            current={scope}
            value="all"
            label="All public IPs"
            description="Sweep every indexed IP across the platform. Persists at most 1 case for the closest scoring IP."
            onSelect={setScope}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg shadow-stone-900/10"
        >
          {submitting ? "Submitting…" : isProcessing ? "Scanning…" : jobId ? "Scan again" : "Run scan"}
        </button>
        {(jobId || file || imageUrl) && (
          <button
            onClick={handleReset}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {/* Live pipeline state */}
      {jobId && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              {isComplete ? "Scan complete" : "Scanning…"}
            </h2>
            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {scope === "own" ? "sweeping your IPs" : "sweeping all public IPs"}
              </div>
            )}
          </div>

          {job?.status === "failed" && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
              Scan failed: {job.error}
            </div>
          )}

          {isComplete && cases.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl px-5 py-4">
              No suspicious matches — image appears clear.
            </div>
          )}

          {cases.length > 0 && (
            <>
              <p className="text-sm text-stone-500">
                {cases.length} case{cases.length !== 1 ? "s" : ""} created. Click into one to see
                the pipeline trace and take action.
              </p>
              <div className="grid gap-4">
                {cases.map((c) => (
                  <CaseCard key={c.id} c={c} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ScopeOption({
  current,
  value,
  label,
  description,
  onSelect,
}: {
  current: ScopeMode;
  value: ScopeMode;
  label: string;
  description: string;
  onSelect: (v: ScopeMode) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        active
          ? "border-amber-600 bg-amber-50/40"
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            active ? "border-amber-600 bg-amber-600" : "border-stone-300"
          }`}
        >
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white m-auto mt-[3px]" />}
        </div>
        <div className="text-sm font-bold text-stone-900">{label}</div>
      </div>
      <div className="mt-1.5 text-xs text-stone-500 leading-snug">{description}</div>
    </button>
  );
}
