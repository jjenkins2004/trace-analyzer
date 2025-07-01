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
  TooltipContentProps,
} from "recharts";

function getDensityColor(score: number): string {
    if (score < 0.2) return "text-green-500";
    if (score < 0.4) return "text-lime-400";
    if (score < 0.6) return "text-yellow-400";
    if (score < 0.8) return "text-orange-500";
    return "text-red-500";
  }

  function getDensityText(score: number): string {
    if (score < 0.2) return "Very Sparse";
    if (score < 0.4) return "Sparse";
    if (score < 0.6) return "Moderately Dense";
    if (score < 0.8) return "Very Dense";
    return "Extremely Dense";
  }

export interface ReportProps {
  report: ReportData;
}

const Report: React.FC<ReportProps> = ({ report }) => {
  const { title, date, density } = report;

  function getDensityGraphData() {
    return density.bins.map((bin, index) => {
      return {
        id: index,
        startTime: bin.start_time,
        endTime: bin.end_time,
        timestamp: bin.start_time + (bin.end_time - bin.start_time) / 2,
        value: bin.density_rating_in_interval,
      } as DensityDataPoint;
    });
  }

  return (
    <div className="min-h-full p-8 text-text">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">{title}</h1>
        <p className="text-sm text-text-muted">
          Created on {new Date(date).toLocaleString()}
        </p>
      </div>

      {/*Bin Graph*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Network Density over Time
        </h2>
        <DensityGraph data={getDensityGraphData()} />
      </section>

      {/* Summary */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary mb-4">
          Density Analysis
        </h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-background-dark p-8 rounded-lg">
            <p className="text-lg text-text-muted">
              Overall Density Score (0-1)
            </p>
            <p className="text-2xl font-extrabold">
              {density.density_rating.toPrecision(3)}
            </p>
          </div>
          <div className="bg-background-dark p-8 rounded-lg">
            <p className="text-lg text-text-muted">
              This means your network is:
            </p>
            <p
              className={`text-2xl font-extrabold ${getDensityColor(density.density_rating)}`}
            >{`${getDensityText(density.density_rating)}`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
        <FrameGraph data={getDensityGraphData()} />
      </section>
    </div>
  );
};

export default Report;

interface DensityDataPoint {
  id: number;
  startTime: number;
  endTime: number;
  timestamp: number;
  value: number;
}

interface DensityGraphProps {
  data: DensityDataPoint[];
}
const DensityGraph: React.FC<DensityGraphProps> = ({ data }) => {
  const CustomTooltip: React.FC<TooltipContentProps<number, string>> = ({
    active,
    payload,
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-gray-800 text-white text-sm p-3 rounded shadow-lg">
        <div className="font-medium text-indigo-300">
          Interval: {data.startTime.toFixed(1)}s – {data.endTime.toFixed(1)}s
        </div>
        <div>
          Density Score:{" "}
          <span className={`font-semibold ${getDensityColor(data.value)}`}>
            {data.value.toPrecision(2)}
          </span>
        </div>
      </div>
    );
  };

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
          <Tooltip content={CustomTooltip} />

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

interface FrameGraphDataPoint {
  id: number;
  startTime: number;
  endTime: number;
  timestamp: number;
  value: number;
}

interface FrameGraphProps {
  data: FrameGraphDataPoint[];
}

const FrameGraph: React.FC<FrameGraphProps> = ({ data }) => {
  const CustomTooltip: React.FC<TooltipContentProps<number, string>> = ({
    active,
    payload,
    label,
  }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-gray-800 text-white text-sm p-3 rounded shadow-lg">
        <div className="font-medium text-indigo-300">
          Interval: {data.startTime.toFixed(1)}s – {data.endTime.toFixed(1)}s
        </div>
        <div>
          Density Score:{" "}
          <span className="font-semibold text-red-400">
            {data.value.toPrecision(2)}
          </span>
        </div>
      </div>
    );
  };

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
          <Tooltip content={CustomTooltip} />

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
