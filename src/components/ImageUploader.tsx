import { useState, useRef, type DragEvent } from "react";

interface Props {
  onUpload: (files: File[]) => void;
  uploading?: boolean;
  accept?: string;
  multiple?: boolean;
  label?: string;
}

export default function ImageUploader({ onUpload, uploading, accept = "image/*", multiple = true, label = "Drop images here or click to browse" }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) onUpload(files);
  }

  function handleChange() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length) onUpload(files);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
      } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <p className="text-gray-500 text-sm">{uploading ? "Uploading..." : label}</p>
    </div>
  );
}
