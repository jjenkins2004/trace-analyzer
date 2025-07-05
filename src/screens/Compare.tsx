import { ReportData } from "../types";
import ReportPage from "../components/ReportPage";

export interface CompareProps {
  shownReport: ReportData | null;
}

const Compare: React.FC<CompareProps> = ({ shownReport }) => {
  if (!shownReport) {
    return <>Compare page</>;
  }
  return <ReportPage report={shownReport} />;
};
export default Compare;
