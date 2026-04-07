import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getTrademark,
  deleteTrademark,
  updateTrademark,
  uploadTrademarkImages,
  deleteTrademarkImage,
  setImagePoseLabel,
  type Trademark,
  type TrademarkImage,
  type IpType,
} from "../api";
import { useJobPoller } from "../hooks/useJobPoller";
import ImageUploader from "../components/ImageUploader";
import RuleEditor from "../components/RuleEditor";

export default function TrademarkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trademark, setTrademark] = useState<Trademark | null>(null);
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
      setTrademark(data.trademark);
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

  async function handlePoseLabel(imageId: string, poseLabel: string | null) {
    if (!id) return;
    await setImagePoseLabel(id, imageId, poseLabel);
    load();
  }

  async function handleIpTypeChange(newType: IpType) {
    if (!id || !trademark || trademark.ip_type === newType) return;
    await updateTrademark(id, { ip_type: newType });
    load();
  }

  async function handleDelete() {
    if (!id || !confirm("Delete this trademark and all its images?")) return;
    await deleteTrademark(id);
    navigate("/trademarks");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!trademark) return <p className="text-red-600 p-8">Trademark not found</p>;

  const pendingImages = images.filter((i) => i.status === "pending");

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{trademark.name}</h1>
          {trademark.description && <p className="mt-1 text-sm text-slate-500">{trademark.description}</p>}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <select
              value={trademark.ip_type}
              onChange={(e) => handleIpTypeChange(e.target.value as IpType)}
              className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              title="Change IP type"
            >
              <option value="mark">mark</option>
              <option value="character">character</option>
            </select>
            <span className="text-slate-400">{images.length} reference image{images.length !== 1 ? "s" : ""}</span>
            {trademark.centroid_dino ? (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Indexed</span>
            ) : pendingImages.length > 0 ? (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full">
                {pendingImages.length} pending
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full">No images</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/test?trademark=${trademark.id}`}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
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
            <div key={img.id} className="relative group rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                  className="bg-white/90 text-red-500 rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-red-50 border border-slate-200 shadow-sm"
                  title="Delete image"
                >
                  x
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium space-y-1">
                <div>
                  {img.status === "indexed" ? (
                    <span className="text-emerald-600">Indexed</span>
                  ) : img.status === "failed" ? (
                    <span className="text-red-500">Failed</span>
                  ) : (
                    <span className="text-slate-400">Pending</span>
                  )}
                </div>
                {trademark.ip_type === "character" && img.status === "indexed" && (
                  <input
                    value={img.pose_label ?? ""}
                    onChange={(e) => handlePoseLabel(img.id, e.target.value || null)}
                    placeholder="pose label…"
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-rose-400"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules section — only when there's something to attach rules to */}
      {trademark.centroid_dino && (
        <div className="pt-6 border-t border-slate-100">
          <RuleEditor
            trademarkId={trademark.id}
            ipType={trademark.ip_type}
            initialGuidelines={trademark.guidelines}
            onGuidelinesSaved={(g) => setTrademark({ ...trademark, guidelines: g })}
          />
        </div>
      )}
    </div>
  );
}
