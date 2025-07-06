// ==============================
// Process Type
// ==============================

export enum Process {
  THROUGHPUT = "THROUGHPUT",
  DENSITY = "DENSITY",
}

// ==============================
// Payload Input
// ==============================

export interface Payload {
  process: Process;
  path: string;
  ap: string | null;
  host: string | null;
}

// ==============================
// Error Handling
// ==============================

export enum Errors {
  TITLE_EXITST,
  NO_TITLE,
  NO_HOST,
  NO_AP,
  NO_DATA,
  PROCESSING_ERROR,
  UNKNOWN,
}

export interface ErrorWithCode extends Error {
  code?: Errors;
}

export function serializeError(error: unknown) {
  if (error instanceof Error && "code" in error) {
    return JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
    });
  }
  return JSON.stringify({
    message: error,
    name: "",
    stack: "",
    code: Errors.UNKNOWN,
  });
}

export function parseError(err: unknown): ErrorWithCode | null {
  if (!(err instanceof Error)) return null;

  const jsonStart = err.message.indexOf("{");
  const jsonEnd = err.message.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  const jsonStr = err.message.substring(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonStr) as ErrorWithCode;
  } catch {
    return null;
  }
}

export function createError(message: string, code: Errors): ErrorWithCode {
  const err = new Error(message) as ErrorWithCode;
  err.code = code;
  return err;
}

// ==============================
// Throughput Analysis
// ==============================

export interface SlidingWindowPoint {
  timestamp: number;
  rssi: number;
  data_rate: number;
  retry_rate: number;
  throughput: number;
  time_on_air_us: number
}

export interface ThroughputAnalysis {
  avg_rssi: number;
  avg_retry: number;
  avg_througput: number;
  total_frames: number;
  time_on_air_us: number;
  points: SlidingWindowPoint[];
}

export interface ThroughputReport {
  id: string;
  title: string;
  date: Date;
  apSource: string;
  hostDest: string;
  type: Process.THROUGHPUT;
  throughput: ThroughputAnalysis;
}

export interface ThroughputReportInput {
  type: Process.THROUGHPUT;
  title: string;
  apSource: string;
  hostDest: string;
  data: ThroughputAnalysis;
}

export interface ThroughputProcessingResponse {
  type: Process.THROUGHPUT;
  data: ThroughputAnalysis;
}

// ==============================
// Density Analysis
// ==============================

export interface DeviceInfo {
  sa: string;
  total_frames: number;
  total_rssi: number;
  score: number;
}

export interface Bin {
  devices: DeviceInfo[];
  total_devices_in_interval: number;
  total_frames_in_interval: number;
  avg_rssi_in_interval: number;
  density_rating_in_interval: number;
  start_time: number;
  end_time: number;
}

export interface DensityAnalysis {
  interval: number;
  bins: Bin[];
  total_devices: number;
  total_frames: number;
  avg_rssi: number;
  density_rating: number;
}

export interface DensityReport {
  id: string;
  title: string;
  date: Date;
  type: Process.DENSITY;
  density: DensityAnalysis;
}

export interface DensityReportInput {
  type: Process.DENSITY;
  title: string;
  data: DensityAnalysis;
}

export interface DensityProcessingResponse {
  type: Process.DENSITY;
  data: DensityAnalysis;
}

// ==============================
// Shared Report Types
// ==============================

export type ProcessingResponse =
  | ThroughputProcessingResponse
  | DensityProcessingResponse;

export type ReportData = DensityReport | ThroughputReport;

export type ReportDataInput = DensityReportInput | ThroughputReportInput;
