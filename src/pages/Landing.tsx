import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        Visual Trademark Detection
      </h1>
      <p className="text-lg text-gray-600 leading-relaxed">
        Register your trademarks with reference images, then check any image for visual similarity.
        Powered by DINOv2 and CLIP neural embeddings with sliding-window detection.
      </p>
      <div className="flex justify-center gap-4">
        {user ? (
          <>
            <Link
              to="/trademarks"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              My Trademarks
            </Link>
            <Link
              to="/check"
              className="px-6 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Check an Image
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6 pt-8 text-left">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Register</h3>
          <p className="text-sm text-gray-500">
            Upload reference images of your trademark. Our ML models extract visual embeddings for matching.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Index</h3>
          <p className="text-sm text-gray-500">
            DINOv2 + CLIP compute centroid embeddings across your references for robust detection.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-2">Detect</h3>
          <p className="text-sm text-gray-500">
            Upload any image to check for trademark presence. See bounding boxes and confidence scores.
          </p>
        </div>
      </div>
    </div>
  );
}
