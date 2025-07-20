import { ReportData } from "../types";
import ReportPage from "../components/ReportPage";
import { FileText } from "lucide-react";

export interface AnalyzeProps {
  shownReport: ReportData | null;
}

const Analyze: React.FC<AnalyzeProps> = ({ shownReport }) => {
  if (!shownReport) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[var(--color-background)] rounded-2xl shadow-lg">
        <FileText size={48} className="text-[var(--color-primary)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--color-text)]">
          No Report Selected
        </h2>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Please select a report to get started.
        </p>
      </div>
    );
  }
  return <ReportPage report={shownReport} />;
};
export default Analyze;
