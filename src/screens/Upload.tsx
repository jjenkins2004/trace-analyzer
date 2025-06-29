import React, { useRef, DragEvent } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { processTrace, sendTrace } from "../pyHelper";

interface UploadProps {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
}

const UploadPage: React.FC<UploadProps> = ({ file, setFile }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    const picked = selected[0];
    if (!picked.name.toLowerCase().endsWith(".pcap")) {
      alert("Only .pcap files are accepted.");
      return;
    }
    setFile(picked);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files);
  };

  const onSelectClick = () => {
    inputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    if (inputRef.current) {
      // clear the browser’s file picker value
      inputRef.current.value = "";
    }
  };

  const upload = () => {
    if (!file) return;
    processTrace(file.path)
      .then(() => {})
      .catch(() => {});
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div
        className="w-full max-w-md p-6 border-2 border-dashed border-gray-600 rounded-lg text-center text-gray-400 hover:border-gray-400 cursor-pointer"
        onClick={onSelectClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <UploadCloud className="mx-auto mb-4 w-12 h-12 text-gray-500" />
        <p className="mb-2">Drag & drop .pcap file here</p>
        <p className="underline">or click to select</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pcap"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />
      </div>

      {file && (
        <div className="w-full max-w-md mt-6 bg-gray-700 rounded-lg p-4">
          <h2 className="text-gray-200 font-medium mb-2">Selected Trace</h2>
          <div className="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
            <span className="truncate text-gray-300">{file.name}</span>
            <button onClick={removeFile}>
              <Trash2 className="w-5 h-5 text-red-400 hover:text-red-600" />
            </button>
          </div>
          <button
            onClick={upload}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
          >
            Analyze
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
