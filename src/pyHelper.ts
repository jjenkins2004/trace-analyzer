import { DensityAnalysis } from "./types";

interface traceData {
  density: DensityAnalysis;
}

export async function processTrace(path: string) {
  const response = await sendTrace(path);

  const parsed = JSON.parse(response) as traceData;

  return await createReport(parsed);
}

async function sendTrace(path: string) {
  const res = await window.ipcRenderer.invoke("request", path);
  return res;
}

async function createReport(report: traceData) {
  const res = await window.ipcRenderer.invoke("createReport", report);
  return res;
}
