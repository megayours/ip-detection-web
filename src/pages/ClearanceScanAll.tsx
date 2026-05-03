import { useEffect, useRef, useState } from "react";
import ImageUploader from "../components/ImageUploader";
import {
  submitScanAll,
  getScanAllResult,
  type ScanAllResult,
  type DesignMatch,
  type GiantbombMatch,
} from "../api";

/**
 * Scan All — unified pre-screen that hits brands + designs + pop_culture
 * in parallel and renders matches grouped by category. Useful when an
 * image could plausibly contain IP from any of the three (e.g. a Disney
 * character on a designer bag).
 */

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function BrandCard({ m }: { m: any }) {
  return (
    <div className="border border-stone-200 rounded-xl bg-white p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-semibold text-sm text-stone-900 truncate">{m.name || m.ip}</h4>
        <span className="font-mono tabular-nums text-xs text-stone-700">{pct(m.score ?? 0)}</span>
      </div>
      {m.evidence && (
        <div className="mt-1 text-[11px] text-stone-500">
          via {Array.isArray(m.evidence) ? m.evidence.join(" + ") : String(m.evidence)}
        </div>
      )}
    </div>
  );
}

function DesignCard({ m }: { m: DesignMatch }) {
  return (
    <a
      href={m.wipo_link || undefined}
      target={m.wipo_link ? "_blank" : undefined}
      rel={m.wipo_link ? "noopener noreferrer" : undefined}
      className="block border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex gap-3">
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
          {m.preview_url ? (
            <img src={m.preview_url} alt={m.registration_id} className="w-full h-full object-contain" />
          ) : (
            <span className="text-stone-300 text-xs">no image</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="font-semibold text-sm text-stone-900 truncate">{m.registration_id}</h4>
            <span className="font-mono tabular-nums text-xs text-stone-700">{pct(m.score)}</span>
          </div>
          {m.product_class && <div className="mt-1 text-[11px] text-stone-500">{m.product_class}</div>}
          {m.vlm_verdict === "present" && (
            <span className="mt-2 inline-block px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px]">
              VLM ✓
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function PopCard({ m }: { m: GiantbombMatch }) {
  return (
    <a
      href={m.source_url || undefined}
      target={m.source_url ? "_blank" : undefined}
      rel={m.source_url ? "noopener noreferrer" : undefined}
      className="block border border-stone-200 rounded-xl bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex gap-3">
        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center">
          {m.preview_url ? (
            <img src={m.preview_url} alt={m.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-stone-300 text-xs">no image</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h4 className="font-semibold text-sm text-stone-900 truncate">{m.name}</h4>
            <span className="font-mono tabular-nums text-xs text-stone-700">{pct(m.score)}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 mt-0.5">{m.entity_type}</div>
          {m.vlm_verdict === "present" && (
            <span className="mt-2 inline-block px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[10px]">
              VLM ✓
            </span>
          )}
        </div>
      </div>
    </a>
  );
}

function Section<T>({
  title,
  items,
  empty,
  error,
  renderItem,
  elapsed,
}: {
  title: string;
  items: T[];
  empty: string;
  error?: string;
  renderItem: (item: T, key: number) => React.ReactNode;
  elapsed?: number;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-stone-900">
          {title}
          <span className="ml-2 text-xs font-normal text-stone-400">{items.length}</span>
        </h3>
        {typeof elapsed === "number" && (
          <span className="text-[10px] font-mono tabular-nums text-stone-400">{elapsed.toFixed(1)}s</span>
        )}
      </div>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-2">
          {error}
        </div>
      )}
      {items.length === 0 ? (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500">
          {empty}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </section>
  );
}

export default function ClearanceScanAll() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<ScanAllResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    async function poll() {
      try {
        const r = await getScanAllResult(jobId!);
        if (!active) return;
        setResult(r);
        if (r.status === "complete" || r.status === "failed") {
          clearInterval(timerRef.current);
          if (r.status === "failed") setError(r.error || "Analysis failed");
        }
      } catch {
        // ignore poll errors — keep retrying
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
      const { job_id } = await submitScanAll(f);
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
    clearInterval(timerRef.current);
  }

  const isProcessing = !!jobId && (!result || result.status === "pending");
  const isDone = result?.status === "complete";

  const brands = result?.brands?.matches ?? [];
  const designs = result?.designs?.matches ?? [];
  const popCulture = result?.pop_culture?.matches ?? [];
  const timings = result?.timings ?? {};
  const errors = result?.errors ?? {};

  return (
    <div>
      {file && (
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={reset}
            className="px-3 py-1 text-xs font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
          >
            Check another
          </button>
        </div>
      )}

      {!file && (
        <ImageUploader
          onUpload={handleUpload}
          multiple={false}
          label="Drop an image to scan against brands, industrial designs, and pop-culture catalogs at once"
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
          <p className="text-sm text-stone-500">Scanning all catalogs in parallel…</p>
        </div>
      )}

      {isDone && (
        <div className="mt-4">
          {timings.total !== undefined && (
            <div className="mb-4 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 font-mono tabular-nums">
              total {timings.total?.toFixed(1)}s
              {timings.brands !== undefined && ` · brands ${timings.brands.toFixed(1)}s`}
              {timings.designs !== undefined && ` · designs ${timings.designs.toFixed(1)}s`}
              {timings.pop_culture !== undefined && ` · pop ${timings.pop_culture.toFixed(1)}s`}
            </div>
          )}

          <Section
            title="Brands"
            items={brands}
            empty="No brand/trademark matches."
            error={errors.brands}
            elapsed={timings.brands}
            renderItem={(m, i) => <BrandCard key={i} m={m} />}
          />
          <Section
            title="Industrial Designs"
            items={designs}
            empty="No industrial design matches."
            error={errors.designs}
            elapsed={timings.designs}
            renderItem={(m, i) => <DesignCard key={(m as DesignMatch).design_id ?? i} m={m as DesignMatch} />}
          />
          <Section
            title="Pop Culture"
            items={popCulture}
            empty="No pop-culture matches."
            error={errors.pop_culture}
            elapsed={timings.pop_culture}
            renderItem={(m, i) => <PopCard key={(m as GiantbombMatch).entity_id ?? i} m={m as GiantbombMatch} />}
          />
        </div>
      )}
    </div>
  );
}
