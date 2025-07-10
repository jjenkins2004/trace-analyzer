import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
} from "recharts";

import { ThroughputReport, SlidingWindowPoint } from "../types";

enum GraphMetric {
  throughput = "Throughput (Mb/s)",
  rssi = "RSSI (dBm)",
  dataRate = "Data Rate (Mb/s)",
  airTime = "Air Time (μs)",
  retryRate = "Retry Rate (%)",
  none = "None",
}

interface MetricConfig {
  dataKey: string;
  unit: string;
  color: string;
}

const GraphMetricConfig: Record<GraphMetric, MetricConfig> = {
  [GraphMetric.throughput]: {
    dataKey: "throughput",
    unit: "Mb/s",
    color: "var(--color-primary)",
  },
  [GraphMetric.rssi]: {
    dataKey: "rssi",
    unit: "dBm",
    color: "var(--color-secondary)",
  },
  [GraphMetric.dataRate]: {
    dataKey: "data_rate",
    unit: "Mb/s",
    color: "var(--color-text-rose)",
  },
  [GraphMetric.airTime]: {
    dataKey: "avg_time_on_air_us",
    unit: "μs",
    color: "var(--color-text-light-blue)",
  },
  [GraphMetric.retryRate]: {
    dataKey: "retry_rate",
    unit: "%",
    color: "var(--color-text-yellow)",
  },
  [GraphMetric.none]: {
    dataKey: "",
    unit: "",
    color: "var(--color-text-muted)",
  },
};

interface Diagnosis {
  title: string;
  message: string;
  color: string;
}

function getDiagnosis(
  rssi: number,
  avgRateRatio: number,
  retryRate: number
): Diagnosis {
  // categorize inputs
  const rssiCat = rssi >= -50 ? "high" : rssi >= -70 ? "med" : "low";
  const rateCat = avgRateRatio >= 0.5 ? "high" : "low";
  const retryCat = retryRate <= 0.25 ? "low" : retryRate <= 0.5 ? "med" : "high";

  // map combos to diagnosis
  if (rssiCat === "high" && rateCat === "high" && retryCat === "low") {
    return {
      title: "Optimal",
      message: `Your signal strength is strong, data rate utilization is at its peak, and retry rate is minimal. You’re operating at near maximum efficiency.`,
      color: "text-green-500",
    };
  }
  if (rssiCat === "high" && rateCat === "low" && retryCat === "low") {
    return {
      title: "Limited Rate",
      message: `Your link shows excellent signal and almost no retries, but data rate utilization is lower than expected. This usually means the Access Point is capping throughput for some internal reason.`,
      color: "text-lime-400",
    };
  }
  if (rssiCat === "high" && rateCat === "high" && retryCat === "high") {
    return {
      title: "Interference",
      message: `Your link speed is good but retries are up, meaning interference is sneaking through undetected by the AP. It could also be random, sudden bursts of interference that the AP can’t anticipate. Try moving devices, changing channels, or removing noise sources.`,
      color: "text-orange-500",
    };
  }
  if (rssiCat === "high" && rateCat === "high" && retryCat === "med") {
    return {
      title: "Interference Warning",
      message: `Good throughput with moderate retries suggests intermittent interference. Monitor the channel and consider moving devices or changing channels.`,
      color: "text-yellow-400",
    };
  }
  if (rssiCat === "high" && rateCat === "low" && retryCat === "med") {
    return {
      title: "Rate Limited + Noise",
      message: `Strong signal but lower throughput with occasional retries indicates the AP may be limiting rate due to intermittent interference.`,
      color: "text-orange-500",
    };
  }
  if (rssiCat === "med" && rateCat === "high" && retryCat === "med") {
    return {
      title: "Stable but Noisy",
      message: `Moderate signal with good data rate but some retries indicates occasional noise. Try cleaning up interference or switching channels.`,
      color: "text-yellow-400",
    };
  }
  if (rssiCat === "med" && rateCat === "low" && retryCat === "med") {
    return {
      title: "Weak & Flaky",
      message: `Moderate signal strength with low throughput and moderate retries. Both signal quality and interference are affecting your link.`,
      color: "text-red-500",
    };
  }
  if (rssiCat === "low" && rateCat === "high" && retryCat === "med") {
    return {
      title: "Unstable Link",
      message: `Low signal but high data rate with some retries means the link could drop. Improve antenna placement or reduce interference.`,
      color: "text-orange-500",
    };
  }
  if (rssiCat === "low" && rateCat === "low" && retryCat === "med") {
    return {
      title: "Weak Link",
      message: `Weak signal and throughput with moderate retries indicates an unstable, slow connection. Relocate closer or upgrade your antenna.`,
      color: "text-red-500",
    };
  }
  if (
    rssiCat === "high" ||
    (rssiCat === "med" && rateCat === "low" && retryCat === "high")
  ) {
    return {
      title: "Severe Interference",
      message: `Solid signal strength with low throughput and high retries indicates a very noisy environment. Try relocating equipment or changing channels.`,
      color: "text-red-500",
    };
  }
  if (rssiCat === "med" && rateCat === "high" && retryCat === "low") {
    return {
      title: "Good",
      message: `Your data rate utilization and retry count are solid, though signal is only moderate. Performance is good, but moving closer can improve throughput.`,
      color: "text-lime-400",
    };
  }
  if (rssiCat === "med" && rateCat === "low" && retryCat === "low") {
    return {
      title: "Weak Signal",
      message: `Low data rate despite few retries suggests your signal is marginal. Improve performance by relocating nearer to the AP, removing obstacles, or boosting antenna gain.`,
      color: "text-yellow-400",
    };
  }
  if (rssiCat === "med" && rateCat === "low" && retryCat === "high") {
    return {
      title: "Weak + Interference",
      message: `Moderate signal combined with low throughput and many retries indicates both weak signal and external noise. Move closer and change channels to improve link quality.`,
      color: "text-red-500",
    };
  }
  if (rssiCat === "low" && rateCat === "low" && retryCat === "high") {
    return {
      title: "Poor Signal",
      message: `Low signal strength with high retry rate and low throughput means the link is unreliable. Relocate devices, remove obstructions, or increase transmit power.`,
      color: "text-red-500",
    };
  }
  if (rssiCat === "low" && rateCat === "low" && retryCat === "low") {
    return {
      title: "Stable",
      message: `Your signal is low but retries are minimal, so the link is steady but slow. If you need more speed, reposition or upgrade your antenna.`,
      color: "text-orange-500",
    };
  }

  // fallback
  return {
    title: "Unknown",
    message: `Diagnosis inconclusive. Verify your measurements and try again, or check for unusual PHY settings.`,
    color: "text-yellow-400",
  };
}

function getThroughputColor(ratio: number) {
  if (ratio > 0.8) return "text-green-500";
  if (ratio > 0.5) return "text-lime-400";
  if (ratio > 0.3) return "text-yellow-400";
  if (ratio < 0.15) return "text-orange-500";
  return "text-red-500";
}

function getRetryColor(retry: number) {
  if (retry < 0.2) return "text-green-500";
  if (retry < 0.35) return "text-lime-400";
  if (retry < 0.5) return "text-yellow-400";
  if (retry < 0.65) return "text-orange-500";
  return "text-red-500";
}

export interface ThroughputPageProps {
  report: ThroughputReport;
}

const ThroughputPage: React.FC<ThroughputPageProps> = ({ report }) => {
  const { title, date, apSource, hostDest, throughput } = report;
  const diagnosis = getDiagnosis(
    throughput.avg_rssi,
    throughput.avg_rate_ratio,
    throughput.avg_retry
  );
  const [leftMetric, setLeftMetric] = useState<GraphMetric>(
    GraphMetric.throughput
  );
  const [rightMetric, setRightMetric] = useState<GraphMetric>(GraphMetric.none);

  function getDataPoints() {
    return throughput.points.map((val, indx) => {
      return { id: indx, point: val } as OverlayGraphDataPoint;
    });
  }

  return (
    <div className="min-h-full p-8 text-text bg-background">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-light mb-3">{title}</h1>
        <p className="text-sm text-text-muted mb-1">
          Created on {new Date(date).toLocaleString()}
        </p>
        <p className="text-sm text-text-muted">
          Packets: {apSource} → {hostDest}
        </p>
      </header>

      {/*Overlay Graph*/}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-primary-light mb-4">
          Throughput Comparison
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

      {/* Summary Cards */}
      <section className="mb-12 space-y-6">
        {/* Top Row: Diagnosis & Throughput */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Throughput Diagnosis */}
          <div className="relative group bg-background-dark p-6 py-8 rounded-lg">
            <h3 className="text-sm text-text-muted">Throughput Diagnosis</h3>
            <p className={`text-3xl font-extrabold ${diagnosis.color}`}>
              {diagnosis.title}
            </p>
            <div className="absolute bottom-full left-0 right-0 mb-2 hidden group-hover:block bg-background-dark text-text text-xs p-2 rounded-lg shadow-lg whitespace-normal z-10">
              {diagnosis.message}
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Throughput is measured against the maximum possible rate
              given current link characteristics.
            </p>
          </div>

          {/* Avg Throughput */}
          <div className="bg-background-dark p-6 py-8 rounded-lg ">
            <h3 className="text-sm text-text-muted">Avg Throughput (Mbps)</h3>
            <p
              className={`text-3xl font-extrabold ${getThroughputColor(
                throughput.avg_rate_ratio
              )}`}
            >
              {throughput.avg_througput.toFixed(2)}
            </p>
             <p className="mt-4 text-xs text-text-muted">
              Estimated downlink throughput based packet data rate and retry rate.
            </p>
          </div>
        </div>

        {/* Bottom Row: Other Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Avg RSSI */}
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Avg RSSI (dBm)</p>
            <p className="text-xl font-medium">
              {throughput.avg_rssi.toFixed(1)}
            </p>
          </div>

          {/* Avg Retry Rate */}
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Avg Retry Rate (%)</p>
            <p
              className={`text-xl font-medium ${getRetryColor(
                throughput.avg_retry
              )}`}
            >
              {(throughput.avg_retry * 100).toFixed(1)}
            </p>
          </div>

          {/* Total Frames */}
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Total Frames</p>
            <p className="text-xl font-medium">{throughput.total_frames}</p>
          </div>

          {/* Time on Air */}
          <div className="bg-background-dark p-4 rounded-lg">
            <p className="text-sm text-text-muted">Time on Air (ms)</p>
            <p className="text-xl font-medium">
              {(throughput.time_on_air_us / 1000).toFixed(2)}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
export default ThroughputPage;

interface OverlayGraphDataPoint {
  id: number;
  point: SlidingWindowPoint;
}

interface OverlayGraphProps {
  data: OverlayGraphDataPoint[];
  left: GraphMetric;
  right: GraphMetric;
}
const OverlayGraph: React.FC<OverlayGraphProps> = ({ data, left, right }) => {
  type AxisSide = "left" | "right";

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
          activeDot={false}
          isAnimationActive={data.length > 500 ? false : true}
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
          <CartesianGrid stroke="#444" strokeDasharray="3 3" />
          <XAxis
            dataKey="id"
            type="number"
            scale="linear"
            domain={[0, "dataMax"]}
            tickFormatter={(id) => id + 1}
            label={{
              value: "Packet Number",
              position: "bottom", // insideBottom, bottom, top, insideTop
              offset: 5, // adjust spacing
              fill: "var(--color-text-muted)",
            }}
          />
          {renderMetric("left", left)}
          {renderMetric("right", right)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
