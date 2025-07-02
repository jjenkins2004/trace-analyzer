// ReportPage.tsx
// React component to display a full report based on ReportData, using Tailwind CSS.

import React from "react";
import { ReportData, DeviceInfo } from "../types";
import {
  BarChart,
  Bar,
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
        averageSNR: bin.avg_snr_in_interval,
        value: bin.density_rating_in_interval,
      } as DensityDataPoint;
    });
  }

  function getFrameGraphData(): FrameGraphDataPoint[] {
    return density.bins.map((bin, index) => {
      // Create a copy of devices descending by frame count
      const sorted = [...bin.devices].sort(
        (a, b) => b.total_frames - a.total_frames
      );

      // Take up to top 3
      const top3 = sorted.slice(0, 3);

      // Create formatted string of device frame contribution
      const topThreeDevices = top3.map((dev) => {
        const pct = (dev.total_frames / bin.total_frames_in_interval) * 100;
        return `${dev.sa} (${pct.toFixed(1)}%)`;
      });

      // Build the interval label
      const interval = `${bin.start_time.toFixed(0)}s – ${bin.end_time.toFixed(
        0
      )}s`;

      return {
        id: index,
        interval,
        frames: bin.total_frames_in_interval,
        topThreeDevices,
        devices: bin.total_devices_in_interval,
      };
    });
  }

  interface DeviceDisplayInfo {
    sa: string;
    total_frames: number;
    total_snr: number;
    mostActiveInterval: string;
  }

  function getTop5Devices(): DeviceDisplayInfo[] {
    // Find total SNR and total frames from every existing device in all time intervals
    const agg = new Map<string, DeviceInfo>();
    for (const bin of density.bins) {
      for (const dev of bin.devices) {
        if (!agg.has(dev.sa)) {
          agg.set(dev.sa, { ...dev });
        } else {
          const existing = agg.get(dev.sa)!;
          existing.total_frames += dev.total_frames;
          existing.total_snr += dev.total_snr;
        }
      }
    }

    // Sort descending by total_frames and slice top 5
    const top5 = Array.from(agg.values())
      .sort((a, b) => b.total_frames - a.total_frames)
      .slice(0, 5);

    // Create our 5 devices
    return top5.map((dev) => {
      // find the bin where this device had its max frames
      let bestBin = density.bins[0];
      let maxFrames = -Infinity;

      for (const bin of density.bins) {
        const d = bin.devices.find((d) => d.sa === dev.sa);
        if (d && d.total_frames > maxFrames) {
          maxFrames = d.total_frames;
          bestBin = bin;
        }
      }

      // format interval string
      const mostActiveInterval = `${bestBin.start_time.toFixed(
        0
      )}s – ${bestBin.end_time.toFixed(0)}s`;

      return {
        sa: dev.sa,
        total_frames: dev.total_frames,
        total_snr: dev.total_snr,
        mostActiveInterval,
      };
    });
  }

  return (
    <div className="min-h-full p-8 text-text">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-light mb-2">{title}</h1>
        <p className="text-sm text-text-muted">
          Created on {new Date(date).toLocaleString()}
        </p>
      </div>

      {/*Bin Graph*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Network Density over Time
        </h2>
        <DensityGraph data={getDensityGraphData()} />
      </section>

      {/* Summary */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
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
              className={`text-2xl font-extrabold ${getDensityColor(
                density.density_rating
              )}`}
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

      {/*Frames Data*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Frames Captured
        </h2>
        <FrameGraph data={getFrameGraphData()} />
      </section>

      {/* Top 5 Devices */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Top Devices
        </h2>
        <div className="overflow-x-auto bg-background-dark rounded-lg">
          <table className="min-w-full divide-y divide-background">
            <thead>
              <tr className="bg-background">
                <th className="px-4 py-2 text-left text-sm font-medium text-text-muted">
                  Source Address
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-text-muted">
                  Total Frames
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-text-muted">
                  Avg SNR per Frame
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium text-text-muted">
                  Most Active During
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background-dark">
              {getTop5Devices().map((dev) => {
                const avgSnr = dev.total_frames
                  ? (dev.total_snr / dev.total_frames).toFixed(2)
                  : "—";
                return (
                  <tr key={dev.sa}>
                    <td className="px-4 py-3 text-sm font-medium text-text">
                      {dev.sa}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text">
                      {dev.total_frames}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text">
                      {avgSnr}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-text">
                      {dev.mostActiveInterval}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
  averageSNR: number;
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
      <div className="bg-background text-text-muted text-sm p-3 rounded shadow-lg flex flex-col gap-1.5">
        <div className="font-medium text-text-light-blue">
          {data.startTime.toFixed(1)}s – {data.endTime.toFixed(1)}s
        </div>
        <div>
          Density Score:{" "}
          <span className={`font-bold ${getDensityColor(data.value)}`}>
            {data.value.toPrecision(2)}
          </span>
        </div>
        <div className="font-extralight text-xs">
          Average SNR:{" "}
          <span className="text-text"> {data.averageSNR.toFixed(1)}</span>
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
            stroke="#4f46e5"
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
  interval: string;
  frames: number;
  topThreeDevices: string[];
  devices: number;
}

interface FrameGraphProps {
  data: FrameGraphDataPoint[];
}

const FrameGraph: React.FC<FrameGraphProps> = ({ data }) => {
  const CustomTooltip: React.FC<TooltipContentProps<number, string>> = ({
    active,
    payload,
  }) => {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload as FrameGraphDataPoint;

    return (
      <div className="bg-gray-800 text-text-muted text-sm p-3 rounded shadow-lg">
        <div className="font-medium text-text-light-blue mb-2">{`${point.interval}`}</div>
        <div className="mb-0.5">
          <span className="font-semibold">Frames:</span>{" "}
          <span className="text-text-light-purple">{point.frames}</span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Devices:</span>{" "}
          <span className="text-text-light-purple">{point.devices}</span>
        </div>
        <div className="text-xs">
          <div className="font-semibold">Received Most Frames From:</div>
          <ul className="list-disc list-inside pl-4 marker:text-text-green-muted">
            {point.topThreeDevices.map((dev, i) => (
              <li key={i}>{dev}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-80 p-4 rounded-lg shadow">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
        >
          <XAxis dataKey="interval" />
          <YAxis />
          <Tooltip content={CustomTooltip} />
          <Bar
            dataKey="frames"
            fill="#4f46e5"
            radius={[4, 4, 0, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
