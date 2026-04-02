import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listTrademarks, createTrademark, type Trademark } from "../api";

export default function Trademarks() {
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const { trademarks } = await listTrademarks();
      setTrademarks(trademarks);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createTrademark(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      setShowCreate(false);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Trademarks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showCreate ? "Cancel" : "New Trademark"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACME Corp Logo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the trademark"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating..." : "Create Trademark"}
          </button>
        </form>
      )}

      {trademarks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No trademarks yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {trademarks.map((tm) => (
            <Link
              key={tm.id}
              to={`/trademarks/${tm.id}`}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-gray-300 transition-colors block"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{tm.name}</h3>
                  {tm.description && <p className="text-sm text-gray-500 mt-1">{tm.description}</p>}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{tm.image_count} image{tm.image_count !== 1 ? "s" : ""}</p>
                  <p>
                    {tm.centroid_dino ? (
                      <span className="text-green-600 font-medium">Indexed</span>
                    ) : tm.indexed_count > 0 ? (
                      <span className="text-orange-500">Partial</span>
                    ) : (
                      <span className="text-gray-400">Not indexed</span>
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
