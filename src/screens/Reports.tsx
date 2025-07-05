import React, { useState, useMemo, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { ReportData, Process } from "../types";

export interface ReportsProps {
  reports: ReportData[];
  onReportClick: (report: ReportData) => void;
  onDeleteReport: (id: string) => void;
}

const Reports: React.FC<ReportsProps> = ({
  reports,
  onReportClick,
  onDeleteReport,
}) => {
  const [sortKey, setSortKey] = useState<"title" | "date">("title");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [reports, sortKey]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!reports || reports.length === 0) {
    return (
      <div className="p-6 text-center text-text-muted">
        No reports available.
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-background p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-primary mb-6">Reports</h1>

      <div className="flex space-x-4 mb-8">
        <button
          type="button"
          onClick={() => setSortKey("title")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
            sortKey === "title"
              ? "bg-primary text-background"
              : "bg-background-dark text-text hover:bg-primary-light hover:text-background"
          }`}
        >
          Sort by Title
        </button>
        <button
          type="button"
          onClick={() => setSortKey("date")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
            sortKey === "date"
              ? "bg-primary text-background"
              : "bg-background-dark text-text hover:bg-primary-light hover:text-background"
          }`}
        >
          Sort by Date
        </button>
      </div>

      <ul className="w-full max-w-xl space-y-4">
        {sortedReports.map((report) => (
          <li key={report.id} className="relative">
            <div className="group w-full flex justify-between items-center bg-background-dark rounded-lg p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
              <button
                type="button"
                onClick={() => onReportClick(report)}
                className="flex-1 text-left"
              >
                <span className="text-lg font-semibold text-text transition-colors group-hover:text-primary-light">
                  {report.title}
                </span>
                <span className="text-sm text-text-muted block">
                  {new Date(report.date).toLocaleString()}
                </span>
                <span className="inline-block text-sm font-medium text-text-muted bg-background-light px-2 py-0.5 rounded">
                  {report.type === Process.THROUGHPUT
                    ? "Wi‑Fi Throughput Report"
                    : "Network Density Report"}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(menuOpenId === report.id ? null : report.id);
                }}
                className="p-2 rounded-full hover:bg-background transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-text-muted hover:text-text transition-colors" />
              </button>

              {/* Options menu */}
              {menuOpenId === report.id && (
                <div
                  ref={menuRef}
                  className="absolute right-4 top-12 bg-background-dark border border-background rounded-md shadow-lg z-10"
                >
                  <button
                    type="button"
                    onClick={() => onDeleteReport(report.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-600 hover:bg-background transition-colors"
                  >
                    Delete Report
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Reports;
