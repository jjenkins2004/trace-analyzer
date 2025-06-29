export enum Errors {
    TITLE_EXITST,
    NO_TITLE,
    PROCESSING_ERROR,
    UNKNOWN
}

export interface ErrorWithCode extends Error {
    code?: Errors
}

export function createError(message: string, code: Errors): ErrorWithCode {
  const err = new Error(message) as ErrorWithCode;
  err.code = code;
  return err;
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