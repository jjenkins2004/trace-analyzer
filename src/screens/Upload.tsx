import React, {
  useRef,
  DragEvent,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { processTrace } from "../helper";
import {
  createError,
  Errors,
  ReportData,
  ErrorWithCode,
  parseError,
} from "../types";
import LoadingScreen from "../components/LoadingScreen";
import SuccessScreen from "../components/SuccessScreen";

export interface UploadProps {
  setReports: Dispatch<SetStateAction<ReportData[]>>;
}

const UploadPage: React.FC<UploadProps> = ({ setReports }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [processing, setProcessing] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<ErrorWithCode | null>(null);
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
    if (title == "") {
      setError(createError("Provide a report title!", Errors.NO_TITLE));
      setTimeout(() => setError(null), 5000);
      return;
    }
    setProcessing(true);
    processTrace(file.path, title)
      .then((report: ReportData) => {
        setReports((prev) => [report, ...prev]);
        setSuccess(true);
      })
      .catch((error) => {
        setError(parseError(error));
      })
      .finally(() => {
        setProcessing(false);
      });
  };

  if (processing) {
    return <LoadingScreen text="Processing trace…" />;
  }

  if (success) {
    return (
      <SuccessScreen
        title={title}
        onUploadAnother={() => {
          removeFile();
          setTitle("");
          setProcessing(false);
          setSuccess(false);
          setError(null);
        }}
        onShowReport={() => {}}
      />
    );
  }

  return (
    <>
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
          <div className="w-full max-w-md">
            <div className="mt-8 space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for this report"
                className={`w-full px-4 py-2 bg-gray-800 text-gray-100 placeholder-gray-500 border-2 rounded-lg focus:outline-none transition-colors duration-400 ease-out
                ${
                  error?.code == Errors.NO_TITLE ||
                  error?.code == Errors.TITLE_EXITST
                    ? "border-red-500 focus:ring-red-500 animate-shake"
                    : "border-gray-600 focus:ring-blue-500"
                }`}
              />
              <p
                className={`h-5 text-sm text-red-500 pt-1 transition-opacity duration-400 ease-in-out ${
                  error &&
                  (error.code === Errors.NO_TITLE ||
                    error.code === Errors.TITLE_EXITST)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                {error &&
                (error.code === Errors.NO_TITLE ||
                  error.code === Errors.TITLE_EXITST)
                  ? error.message
                  : ""}
              </p>
            </div>
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
          </div>
        )}
      </div>
    </>
  );
};

export default UploadPage;
