// ReportPage.tsx
// React component to display a full report based on ReportData, using Tailwind CSS.

import React from "react";
import { ReportData, Bin, DeviceInfo } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export interface ReportProps {
  report: ReportData;
}

const Report: React.FC<ReportProps> = ({ report }) => {
  const { title, date, density } = report;

  const getBinGraphData = () => {
    return density.bins.map((bin, index) => {
      return {
        id: index,
        startTime: bin.start_time,
        endTime: bin.end_time,
        timestamp: bin.start_time + (bin.end_time - bin.start_time) / 2,
        value: bin.density_rating_in_interval,
      } as DataPoint;
    });
  };

  return (
    <div className="min-h-full p-8 text-text">
      <section>
        <BinGraph data={getBinGraphData()} interval={density.interval} />
      </section>
    </div>
  );
};

export default Report;

interface DataPoint {
  id: number;
  startTime: number;
  endTime: number;
  timestamp: number;
  value: number;
}

interface BinGraphProps {
  data: DataPoint[];
  interval: number;
}
const BinGraph: React.FC<BinGraphProps> = ({ data }) => {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#444" strokeDasharray="3 3" />
          <XAxis
            dataKey="id"
            type="number"
            scale="linear"
            domain={[0, "dataMax"]}
            tickFormatter={(id) => `${data[id].timestamp.toFixed(1)}`}
          />
          <YAxis />
          <Tooltip
            formatter={(val: number) => val.toPrecision(2)}
            labelFormatter={(id: number) =>
              `${data[id].startTime.toFixed(1)}s - ${data[id].endTime.toFixed(
                1
              )}s`
            }
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#4f46e5" // Indigo-600
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
