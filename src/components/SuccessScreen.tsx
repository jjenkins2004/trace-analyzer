import React from "react";
import { CheckCircle } from "lucide-react";

export interface SuccessScreenProps {
  title: string;
  onUploadAnother: () => void;
  onShowReport: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({
  title,
  onUploadAnother,
  onShowReport,
}) => (
  <div className="w-full h-full flex flex-col items-center justify-center p-6">
    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
    <h2 className="text-2xl font-semibold text-text-muted mb-6 text-center">
      “{title}” has been successfully analyzed
    </h2>
    <div className="flex space-x-4">
      <button
        onClick={onUploadAnother}
        className="w-48 py-3 bg-primary-dark text-text rounded-lg btn-overlay transition"
      >
        Upload Another
      </button>
      <button
        onClick={onShowReport}
        className="w-48 py-3 bg-secondary-muted text-text rounded-lg btn-overlay transition"
      >
        Show Report
      </button>
    </div>
  </div>
);

export default SuccessScreen;
