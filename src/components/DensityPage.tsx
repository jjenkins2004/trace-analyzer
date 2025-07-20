// ReportPage.tsx
// React component to display a full report based on ReportData, using Tailwind CSS.

import { useState } from "react";
import React from "react";
import { DeviceInfo, DensityReport, Bin } from "../types";
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

enum GraphMetric {
  densityRating = "Density Score",
  nEff = "AP Score",
  u = "Airtime Score",
  d = "Traffic Score",
  advertiserRSSI = "Advertiser RSSI (dBm)",
  frames = "Total Frames",
  beacon_frames = "Beacon Frames",
  devices = "Advertising Devices",
  none = "None",
}

interface MetricConfig {
  dataKey: string;
  unit: string;
  color: string;
}

const GraphMetricConfig: Record<GraphMetric, MetricConfig> = {
  [GraphMetric.densityRating]: {
    dataKey: "density_rating_in_interval",
    unit: "Score",
    color: "var(--color-primary)",
  },
  [GraphMetric.nEff]: {
    dataKey: "N_eff",
    unit: "Score",
    color: "var(--color-secondary)",
  },
  [GraphMetric.u]: {
    dataKey: "U",
    unit: "Score",
    color: "var(--color-text-rose)",
  },
  [GraphMetric.d]: {
    dataKey: "D",
    unit: "Score",
    color: "var(--color-text-light-blue)",
  },
  [GraphMetric.advertiserRSSI]: {
    dataKey: "avg_beacon_rssi_in_interval",
    unit: "RSSI",
    color: "var(--color-text-yellow)",
  },
  [GraphMetric.frames]: {
    dataKey: "total_frames_in_interval",
    unit: "count",
    color: "var(--color-text-light-purple)",
  },
  [GraphMetric.beacon_frames]: {
    dataKey: "total_beacon_frames_in_interval",
    unit: "count",
    color: "var(--color-text-green-muted)",
  },
  [GraphMetric.devices]: {
    dataKey: "total_devices_in_interval",
    unit: "count",
    color: "var(--color-text-orange)",
  },
  [GraphMetric.none]: {
    dataKey: "",
    unit: "",
    color: "var(--color-text-muted)",
  },
};

function getDensityColor(score: number): string {
  if (score < 0.2) return "text-green-500";
  if (score < 0.4) return "text-lime-400";
  if (score < 0.6) return "text-yellow-400";
  if (score < 0.8) return "text-orange-500";
  return "text-red-500";
}

function getDensityText(score: number): string {
  if (score < 0.2) return "Sparse";
  if (score < 0.4) return "Moderately Dense";
  if (score < 0.6) return "Dense";
  if (score < 0.8) return "Very Dense";
  return "Extremely Dense";
}

export interface DensityPageProps {
  report: DensityReport;
}

const DensityPage: React.FC<DensityPageProps> = ({ report }) => {
  const { title, date, density } = report;

  const [leftMetric, setLeftMetric] = useState<GraphMetric>(
    GraphMetric.densityRating
  );
  const [rightMetric, setRightMetric] = useState<GraphMetric>(GraphMetric.none);

  function getDataPoints() {
    return density.bins.map((val, indx) => {
      return { id: indx, point: val } as OverlayGraphDataPoint;
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
        const pct =
          (dev.total_frames / bin.total_beacon_frames_in_interval) * 100;
        return `${dev.sa} (${pct.toFixed(1)}%)`;
      });

      // Build the interval label
      const interval = `${bin.start_time.toFixed(0)}s – ${bin.end_time.toFixed(
        0
      )}s`;

      return {
        id: index,
        interval,
        frames: bin.total_beacon_frames_in_interval,
        topThreeDevices,
        devices: bin.total_devices_in_interval,
      };
    });
  }

  interface DeviceDisplayInfo {
    sa: string;
    total_frames: number;
    total_rssi: number;
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
          existing.total_rssi += dev.total_rssi;
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
        total_rssi: dev.total_rssi,
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

      {/*Overlay Graph*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Density Comparison
        </h2>
        <div className="flex space-x-4 mb-4">
          <div>
            <label className="text-text-muted block mb-1">Left Axis:</label>
            <select
              value={leftMetric}
              onChange={(e) => setLeftMetric(e.target.value as GraphMetric)}
              className="bg-background-dark text-text p-2 rounded"
            >
              {Object.values(GraphMetric).map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value == rightMetric}
                >
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-text-muted block mb-1">Right Axis:</label>
            <select
              value={rightMetric}
              onChange={(e) => setRightMetric(e.target.value as GraphMetric)}
              className="bg-background-dark text-text p-2 rounded"
            >
              {Object.values(GraphMetric).map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={value == leftMetric}
                >
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <OverlayGraph
          data={getDataPoints()}
          left={leftMetric}
          right={rightMetric}
        />
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
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-background-dark p-6 rounded-lg">
            <p className="text-md text-text-muted">Access Point Score</p>
            <p
              className={`text-xl ${getDensityColor(
                density.N_eff
              )} font-medium`}
            >
              {density.N_eff.toPrecision(3)}
            </p>
          </div>
          <div className="bg-background-dark p-6 rounded-lg">
            <p className="text-md text-text-muted">Airtime Score</p>
            <p className={`text-xl ${getDensityColor(density.U)} font-medium`}>
              {density.U.toPrecision(3)}
            </p>
          </div>
          <div className="bg-background-dark p-6 rounded-lg">
            <p className="text-md text-text-muted">Traffic Score</p>
            <p className={`text-xl ${getDensityColor(density.D)} font-medium`}>
              {density.D.toPrecision(3)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6">
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
            <p className="text-sm text-text-muted">Avg Advertiser RSSI</p>
            <p className="text-xl font-medium">
              {density.avg_beacon_rssi.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      {/*Frames Data*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Beacon Frames Captured
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
                  Total Advertising Frames
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
                const avgRssi = dev.total_frames
                  ? (dev.total_rssi / dev.total_frames).toFixed(2)
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
                      {avgRssi}
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

export default DensityPage;

interface OverlayGraphDataPoint {
  id: number;
  point: Bin;
}

interface OverlayGraphProps {
  data: OverlayGraphDataPoint[];
  left: GraphMetric;
  right: GraphMetric;
}
const OverlayGraph: React.FC<OverlayGraphProps> = ({ data, left, right }) => {
  type AxisSide = "left" | "right";

  const CustomTooltip: React.FC<TooltipContentProps<number, string>> = ({
    active,
    payload,
  }) => {
    if (!active || !payload || !payload.length) return null;

    const point = (payload[0].payload as OverlayGraphDataPoint).point;
    const interval = `${point.start_time}s - ${point.end_time.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}s`;

    return (
      <div className="bg-gray-800 text-text-muted text-sm p-3 rounded shadow-lg">
        <div className="font-medium text-text-light-blue mb-2">{`${interval}`}</div>

        {left !== GraphMetric.none && (
          <div className="mb-0.5">
            <span className="font-semibold">{left}</span>
            {": "}
            <span style={{ color: GraphMetricConfig[left].color }}>
              {(
                point[GraphMetricConfig[left].dataKey as keyof Bin] as number
              ).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}

        {right !== GraphMetric.none && (
          <div className="mb-0.5">
            <span className="font-semibold">{right}</span>
            {": "}
            <span style={{ color: GraphMetricConfig[right].color }}>
              {(
                point[GraphMetricConfig[right].dataKey as keyof Bin] as number
              ).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
      </div>
    );
  };

  function renderMetric(
    side: AxisSide,
    metric: GraphMetric
  ): JSX.Element | null {
    if (metric === GraphMetric.none) return null;

    const { dataKey, unit, color } = GraphMetricConfig[metric];

    return (
      <>
        <YAxis
          yAxisId={side}
          orientation={side}
          stroke={color}
          label={{
            value: unit,
            position: "insideTop",
            offset: -30,
            fill: color,
          }}
        />
        <Line
          yAxisId={side}
          type="monotone"
          dataKey={`point.${dataKey}`}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={true}
          isAnimationActive={true}
        />
      </>
    );
  }

  return (
    <div style={{ width: "100%", height: 500 }}>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ bottom: 20, left: 30, right: 30, top: 40 }}
        >
          <XAxis
            dataKey="id"
            stroke="var(--color-text-muted)"
            domain={[0, "dataMax"]}
            tickFormatter={(idx) => {
              const val = data[idx].point.end_time;
              return val.toFixed(2).replace(/\.?0+$/, "");
            }}
            interval={1}
          />
          <Tooltip content={CustomTooltip} />
          <CartesianGrid stroke="#444" strokeDasharray="3 3" />
          {renderMetric("left", left)}
          {renderMetric("right", right)}
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
