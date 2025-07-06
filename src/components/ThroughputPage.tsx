import { ThroughputReport } from "../types";

export interface ThroughputPageProps {
  report: ThroughputReport;
}

const ThroughputPage: React.FC<ThroughputPageProps> = ({ report }) => {
  const { title, date, throughput } = report;

  return (
    <div className="min-h-full p-8 text-text bg-background">
      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary-light mb-2">{title}</h1>
        <p className="text-sm text-text-muted">
          Created on {new Date(date).toLocaleString()}
        </p>
      </header>

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
