import React, { useState, useMemo } from 'react';
import { ReportData } from '../types';

export interface ReportsProps {
  reports: ReportData[];
  onReportClick: (report: ReportData) => void;
}

const Reports: React.FC<ReportsProps> = ({ reports, onReportClick }) => {
  // Default sort by title
  const [sortKey, setSortKey] = useState<'title' | 'date'>('title');

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      if (sortKey === 'title') {
        return a.title.localeCompare(b.title);
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [reports, sortKey]);

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
          onClick={() => setSortKey('title')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
            sortKey === 'title'
              ? 'bg-primary text-background'
              : 'bg-background-dark text-text hover:bg-primary-light hover:text-background'
          }`}
        >
          Sort by Title
        </button>
        <button
          type="button"
          onClick={() => setSortKey('date')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
            sortKey === 'date'
              ? 'bg-primary text-background'
              : 'bg-background-dark text-text hover:bg-primary-light hover:text-background'
          }`}
        >
          Sort by Date
        </button>
      </div>

      <ul className="w-full max-w-xl space-y-4">
        {sortedReports.map((report) => (
          <li key={report.id}>
            <button
              type="button"
              onClick={() => onReportClick(report)}
              className="group w-full flex justify-between items-center bg-background-dark rounded-lg p-4 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="text-lg font-semibold text-text transition-colors group-hover:text-primary-light">
                {report.title}
              </span>
              <span className="text-sm text-text-muted">
                {new Date(report.date).toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Reports;
