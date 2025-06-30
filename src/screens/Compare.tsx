import { ReportData } from "../types";
import Report from "../components/Report";

export interface CompareProps {
  shownReport: ReportData | null;
}

const Compare: React.FC<CompareProps> = ({ shownReport }) => {
  if (!shownReport) {
    return <>Compare page</>;
  }
  console.log(shownReport);
  return <Report report={shownReport} />;
};
export default Compare;
