// ReportPage.tsx
// React component to display a full report based on ReportData, using Tailwind CSS.

import React from "react";
import { ReportData, Bin, DeviceInfo } from "../types";

export interface ReportProps {
  report: ReportData;
}

const formatTimestamp = (ts: number) => new Date(ts).toLocaleString();

const Report: React.FC<ReportProps> = ({ report }) => {
  const { title, date, density } = report;

  console.log("Report in report:", report.density);

  return (
    <div className="min-h-full p-8 text-text">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-sm text-text-muted">
          Created on {new Date(date).toLocaleString()}
        </p>
      </div>

      {/* Summary */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Overall Density Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Interval (s)</p>
            <p className="text-xl font-medium">{density.interval}</p>
          </div>
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Total Devices</p>
            <p className="text-xl font-medium">{density.total_devices}</p>
          </div>
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Total Frames</p>
            <p className="text-xl font-medium">{density.total_frames}</p>
          </div>
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Avg SNR</p>
            <p className="text-xl font-medium">{density.avg_snr.toFixed(2)}</p>
          </div>
        </div>
      </section>

      <section>
        
      </section>

      {/* Bins */}
      <section>
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Interval Bins ({density.bins.length})
        </h2>
        <div className="space-y-8">
          {density.bins.map((bin: Bin, idx: number) => (
            <div key={idx} className="bg-background-dark p-6 rounded-lg">
              <h3 className="text-xl font-medium text-primary mb-2">
                Bin {idx + 1}: {formatTimestamp(bin.start_time)} -{" "}
                {formatTimestamp(bin.end_time)}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-text-muted">Devices</p>
                  <p className="text-lg font-medium">
                    {bin.total_devices_in_interval}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Frames</p>
                  <p className="text-lg font-medium">
                    {bin.total_frames_in_interval}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Avg SNR</p>
                  <p className="text-lg font-medium">
                    {bin.avg_snr_in_interval.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Density Rating</p>
                  <p className="text-lg font-medium">
                    {bin.density_rating_in_interval}
                  </p>
                </div>
              </div>

              {/* Devices Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-background rounded-lg">
                  <thead>
                    <tr className="bg-background">
                      <th className="px-4 py-2 text-left text-text-muted">
                        SA
                      </th>
                      <th className="px-4 py-2 text-left text-text-muted">
                        Total Frames
                      </th>
                      <th className="px-4 py-2 text-left text-text-muted">
                        Total SNR
                      </th>
                      <th className="px-4 py-2 text-left text-text-muted">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bin.devices.map((device: DeviceInfo, di) => (
                      <tr key={di} className="border-t border-background">
                        <td className="px-4 py-2 text-text">{device.sa}</td>
                        <td className="px-4 py-2 text-text">
                          {device.total_frames}
                        </td>
                        <td className="px-4 py-2 text-text">
                          {device.total_snr}
                        </td>
                        <td className="px-4 py-2 text-text">{device.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Report;
