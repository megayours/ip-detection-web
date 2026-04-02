import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

  useEffect(() => {
    load();
  }, [id]);

  // Reload when index job completes
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
    if (!id || !confirm("Delete this trademark and all its images?")) return;
    await deleteTrademark(id);
    navigate("/trademarks");
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!trademark) return <p className="text-red-600">Trademark not found</p>;

  const pendingImages = images.filter((i) => i.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{trademark.name}</h1>
          {trademark.description && <p className="text-gray-500 mt-1">{trademark.description}</p>}
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{images.length} image{images.length !== 1 ? "s" : ""}</span>
        {trademark.centroid_dino ? (
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Indexed</span>
        ) : pendingImages.length > 0 ? (
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">
            {pendingImages.length} pending indexing
          </span>
        ) : (
          <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-medium">No images</span>
        )}
      </div>

      {/* Index job status */}
      {indexJob && indexJob.status !== "completed" && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          indexJob.status === "failed"
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-blue-50 text-blue-700 border border-blue-200"
        }`}>
          {indexJob.status === "failed"
            ? `Indexing failed: ${indexJob.error}`
            : `Indexing in progress (${indexJob.status})...`}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Upload area */}
      <ImageUploader
        onUpload={handleUpload}
        uploading={uploading}
        label="Drop reference images here or click to browse"
      />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden">
              <img src={img.url} alt="" className="w-full aspect-square object-cover" />
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                  className="bg-white/90 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-50 border border-gray-200"
                  title="Delete image"
                >
                  x
                </button>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-white/80 px-2 py-1 text-xs">
                {img.status === "indexed" ? (
                  <span className="text-green-600">Indexed</span>
                ) : img.status === "failed" ? (
                  <span className="text-red-600">Failed</span>
                ) : (
                  <span className="text-gray-400">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
