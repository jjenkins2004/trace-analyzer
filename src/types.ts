export enum Errors {
  TITLE_EXITST,
  NO_TITLE,
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
  if (!(err instanceof Error)) {
    return null;
  }

  const jsonStart = err.message.indexOf("{");
  const jsonEnd = err.message.lastIndexOf("}");

  if (jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart) {
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

export interface processingResponse {
  density: DensityAnalysis;
}

export interface DeviceInfo {
  sa: string;
  total_frames: number;
  total_snr: number;
  score: number;
}

export interface Bin {
  devices: DeviceInfo[];
  total_devices_in_interval: number;
  total_frames_in_interval: number;
  avg_snr_in_interval: number;
  density_rating_in_interval: number;
  start_time: number;
  end_time: number;
}

export interface DensityAnalysis {
  interval: number;
  bins: Bin[];
  total_devices: number;
  total_frames: number;
  avg_snr: number;
  density_rating: number;
}

export interface ReportData {
  id: string;
  title: string;
  density: DensityAnalysis;
}

export interface ReportDataInput {
  title: string;
  density: DensityAnalysis;
}
