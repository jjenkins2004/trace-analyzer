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

export interface ThroughputPageProps {
  report: ThroughputReport;
}

const ThroughputPage: React.FC<ThroughputPageProps> = ({ report }) => {
  const { title, date, throughput } = report;
  const [leftMetric, setLeftMetric] = useState<GraphMetric>(
    GraphMetric.throughput
  );
  const [rightMetric, setRightMetric] = useState<GraphMetric>(GraphMetric.none);

  function getDataPoints() {
    return throughput.points.map((val, indx) => {
      return { id: indx, point: val } as OverlayGraphDataPoint;
    });
  }

  console.log(throughput);

  return (
    <div className="min-h-full p-8 text-text bg-background">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-light mb-2">{title}</h1>
        <p className="text-sm text-text-muted">
          Created on {new Date(date).toLocaleString()}
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
      <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avg Throughput */}
        <div className="bg-background-dark p-6 rounded-lg">
          <p className="text-sm text-text-muted">Avg Throughput (Mbps)</p>
          <p className="text-3xl font-extrabold text-secondary">
            {throughput.avg_througput.toFixed(2)}
          </p>
        </div>

        {/* Avg RSSI */}
        <div className="bg-background-dark p-6 rounded-lg">
          <p className="text-sm text-text-muted">Avg RSSI (dBm)</p>
          <p className="text-3xl font-extrabold text-primary">
            {throughput.avg_rssi.toFixed(1)}
          </p>
        </div>

        {/* Avg Retry */}
        <div className="bg-background-dark p-6 rounded-lg">
          <p className="text-sm text-text-muted">Avg Retry Rate (%)</p>
          <p className="text-3xl font-extrabold text-primary-light">
            {(throughput.avg_retry * 100).toFixed(1)}
          </p>
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
