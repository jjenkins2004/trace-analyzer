import { processingResponse, ReportData, ReportDataInput } from "./types";

export async function processTrace(path: string, title: string) {
  console.log("Beginning processing with path:", path);

  // Send our trace to our backend for processing
  const response = await sendTrace(path);

  // Create a payload with the report title
  const payload: ReportDataInput = { title: title, ...response };

  // Create the report and add it to our persistent store
  return await createReport(payload);
}

async function sendTrace(path: string): Promise<processingResponse> {
  const res: processingResponse = await window.ipcRenderer.invoke(
    "request",
    path
  );
  return res;
}

async function createReport(report: ReportDataInput): Promise<ReportData> {
  const res = await window.ipcRenderer.invoke("createReport", report);
  return res;
}
