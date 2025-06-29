import { DensityAnalysis, ReportData, ReportDataInput } from "./types";

interface traceData {
  density: DensityAnalysis;
}

export async function processTrace(path: string, title: string) {
  const response = await sendTrace(path);

  const parsed = JSON.parse(response) as traceData;
  const payload: ReportDataInput = { title: title, ...parsed };

  return await createReport(payload);
}

async function sendTrace(path: string): Promise<string> {
  const res = await window.ipcRenderer.invoke("request", path);
  return res;
}

async function createReport(report: traceData): Promise<ReportData> {
  const res = await window.ipcRenderer.invoke("createReport", report);
  return res;
}
