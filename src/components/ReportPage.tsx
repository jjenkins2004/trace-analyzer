import { ReportData, Process } from "../types";
import DensityPage from "./DensityPage";

export interface ReportPageProps {
  report: ReportData;
}

const ReportPage: React.FC<ReportPageProps> = ({ report }) => {
  if (report.type == Process.DENSITY) {
    return <DensityPage report={report} />;
  } else {
    return <></>;
  }
};
export default ReportPage;
