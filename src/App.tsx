import React, { useEffect, useState } from "react";
import { HashRouter, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Upload from "./screens/Upload";
import Compare from "./screens/Compare";
import Reports from "./screens/Reports";

import { ReportData } from "./types";
import { getAllReports, deleteReport } from "./helper";

const PersistedApp: React.FC = () => {
  const location = useLocation();
  const [globalReports, setGlobalReports] = useState<ReportData[]>([]);

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

  return (
    <div className="flex flex-col w-full h-full">
      <Navbar />

      <div className="flex-1">
        <div
          className={
            location.pathname === "/" ? "block w-full h-full" : "hidden"
          }
        >
          <Upload setReports={setGlobalReports} />
        </div>
        <div
          className={
            location.pathname === "/compare" ? "block w-full h-full" : "hidden"
          }
        >
          <Compare />
        </div>
        <div
          className={
            location.pathname === "/reports" ? "block w-full h-full" : "hidden"
          }
        >
          <Reports
            reports={globalReports}
            onReportClick={() => {}}
            onDeleteReport={onDeleteReport}
          />
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
