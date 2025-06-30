import {
  ErrorWithCode,
  processingResponse,
  ReportData,
  ReportDataInput,
} from "./types";

export async function processTrace(path: string, title: string) {
  console.log("Beginning processing with path:", path);

  // Check if title is available
  await checkTitle(title);

  // Send our trace to our backend for processing
  const response = await sendTrace(path);

  // Create a payload with the report title
  const payload: ReportDataInput = { title: title, ...response };

  // Create the report and add it to our persistent store
  return await createReport(payload);
}

async function checkTitle(title: string): Promise<null> {
  await window.ipcRenderer.invoke("checkTitle", title);
  return null;
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

export async function getAllReports(): Promise<ReportData[]> {
  return await window.ipcRenderer.invoke("getReports");
}
