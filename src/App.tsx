import React, { useEffect, useState } from "react";
import { HashRouter, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Upload from "./screens/Upload";
import Analyze from "./screens/Analyze";
import Reports from "./screens/Reports";

import { ReportData } from "./types";
import { getAllReports, deleteReport } from "./helper";

const PersistedApp: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [globalReports, setGlobalReports] = useState<ReportData[]>([]);
  const [shownReport, setShownReport] = useState<ReportData | null>(null);

  useEffect(() => {
    getAllReports()
      .then((reports: ReportData[]) => {
        setGlobalReports(reports);
      })
      .catch((err) => console.log("Failed to fetch reports:", err));
  }, []);

  const onDeleteReport = (id: string) => {
    deleteReport(id)
      .then(() => {
        console.log("deleted", id);
        setGlobalReports((prev) => prev.filter((report) => report.id !== id));
      })
      .catch((err) => console.log("Failed to delete report:", err));
  };

  const onReportClick = (report: ReportData) => {
    setShownReport(report);
    navigate("/analyze");
  };

  return (
    <div className="flex flex-col w-full h-full max-h-screen">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center items-center min-h-0">
        <div className="max-h-full w-full overflow-y-scroll">
          <div className={location.pathname === "/" ? "block" : "hidden"}>
            <Upload setReports={setGlobalReports} onShowReport={onReportClick}/>
          </div>
          <div
            className={location.pathname === "/analyze" ? "block" : "hidden"}
          >
            <Analyze shownReport={shownReport} />
          </div>
          <div
            className={location.pathname === "/reports" ? "block" : "hidden"}
          >
            <Reports
              reports={globalReports}
              onReportClick={onReportClick}
              onDeleteReport={onDeleteReport}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <PersistedApp />
  </HashRouter>
);

export default App;
