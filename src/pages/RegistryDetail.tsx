import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getTrademark,
  deleteTrademark,
  uploadTrademarkImages,
  deleteTrademarkImage,
  type Trademark,
  type TrademarkImage,
} from "../api";
import { useJobPoller } from "../hooks/useJobPoller";
import ImageUploader from "../components/ImageUploader";
import RuleEditor from "../components/RuleEditor";

export default function RegistryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ip, setIp] = useState<Trademark | null>(null);
  const [images, setImages] = useState<TrademarkImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [indexJobId, setIndexJobId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const indexJob = useJobPoller(indexJobId);

  async function load() {
    if (!id) return;
    try {
      const data = await getTrademark(id);
      setIp(data.trademark);
      setImages(data.images);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (indexJob?.status === "completed" || indexJob?.status === "failed") {
      load();
      if (indexJob.status === "completed") setIndexJobId(null);
    }
  }, [indexJob?.status]);

  async function handleUpload(files: File[]) {
    if (!id) return;
    setUploading(true);
    setError("");
    try {
      const { job_id } = await uploadTrademarkImages(id, files);
      setIndexJobId(job_id);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!id) return;
    await deleteTrademarkImage(id, imageId);
    load();
  }

  async function handleDelete() {
    if (!id || !confirm("Delete this IP and all its images?")) return;
    await deleteTrademark(id);
    navigate("/registry");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!ip) return <p className="text-red-600 p-8">IP not found</p>;

  const pendingImages = images.filter((i) => i.status === "pending");

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">{ip.name}</h1>
          {ip.description && <p className="mt-1 text-sm text-stone-500">{ip.description}</p>}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-stone-400">{images.length} reference image{images.length !== 1 ? "s" : ""}</span>
            {ip.centroid_dino ? (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Indexed</span>
            ) : pendingImages.length > 0 ? (
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
                {pendingImages.length} pending
              </span>
            ) : (
              <span className="text-xs font-semibold text-stone-400 bg-stone-50 px-2.5 py-0.5 rounded-full">No images</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/test?trademark=${ip.id}`}
            className="px-4 py-2 text-sm font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-all"
          >
            Test mockup
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm text-red-500 border border-red-100 rounded-xl hover:bg-red-50 transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {!ip.description && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Add a description for better clearance results</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Describe the design concept, shape, and distinguishing features — e.g. "egg-shaped smartphone case with smooth organic curves." This helps detect similar designs even when colors or styles differ.
            </p>
          </div>
        </div>
      )}

      {/* Index job status */}
      {indexJob && indexJob.status !== "completed" && (
        <div className={`rounded-xl px-5 py-4 text-sm ${
          indexJob.status === "failed"
            ? "bg-red-50 text-red-700 border border-red-100"
            : "bg-blue-50 text-blue-700 border border-blue-100"
        }`}>
          {indexJob.status === "failed"
            ? `Indexing failed: ${indexJob.error}`
            : (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Indexing reference images...
              </div>
            )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-5 py-4">
          {error}
        </div>
      )}

      {/* Upload */}
      <ImageUploader
        onUpload={handleUpload}
        uploading={uploading}
        label="Drop reference images here or click to browse"
      />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                  className="bg-white/90 text-red-500 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-red-50 border border-stone-200 shadow-sm"
                  title="Delete image"
                >
                  x
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium">
                {img.status === "indexed" ? (
                  <span className="text-emerald-600">Indexed</span>
                ) : img.status === "failed" ? (
                  <span className="text-red-500">Failed</span>
                ) : (
                  <span className="text-stone-400">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules section — only when there's something to attach rules to */}
      {ip.centroid_dino && (
        <div className="pt-6 border-t border-stone-100">
          <RuleEditor
            trademarkId={ip.id}
            initialGuidelines={ip.guidelines}
            initialBaselineConfig={ip.baseline_config}
            onGuidelinesSaved={(g) => setIp({ ...ip, guidelines: g })}
            onBaselineSaved={(cfg) => setIp({ ...ip, baseline_config: cfg })}
          />
        </div>
      )}
    </div>
  );
}
