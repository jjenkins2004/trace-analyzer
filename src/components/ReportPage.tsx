import { ReportData, Process } from "../types";
import DensityPage from "./DensityPage";
import ThroughputPage from "./ThroughputPage";

export interface ReportPageProps {
  report: ReportData;
}

const ReportPage: React.FC<ReportPageProps> = ({ report }) => {
  if (report.type == Process.DENSITY) {
    return <DensityPage report={report} />;
  } else {
    return <ThroughputPage report={report} />;
  }
};
export default ReportPage;
