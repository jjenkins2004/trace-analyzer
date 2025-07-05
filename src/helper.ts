import {
  ProcessingResponse,
  ReportData,
  ReportDataInput,
  Process,
  Payload,
} from "./types";

export async function createDensityReport(path: string, title: string) {
  console.log("Creating Density Report with path:", path);

  // Check if title is available
  await checkTitle(title);

  // Send our trace to our backend for processing
  const payload: Payload = {
    process: Process.DENSITY,
    path: path,
    ap: null,
    host: null,
  };
  const response = await sendTrace(payload);

  if (response.type != Process.DENSITY) {
    throw Error("Did not get Process.Throughput type");
  }

  // Create a payload with the report title
  const report: ReportDataInput = {
    type: Process.DENSITY,
    title: title,
    data: response.data,
  };

  // Create the report and add it to our persistent store
  return await createReport(report);
}

export async function createThroughputReport(
  path: string,
  ap: string,
  host: string,
  title: string
) {
  console.log("Creating Throughput Report with path:", path);

  // Check if title is available
  await checkTitle(title);

  // Send our trace to our backend for processing
  const payload: Payload = {
    process: Process.THROUGHPUT,
    path: path,
    ap: ap,
    host: host,
  };
  const response = await sendTrace(payload);

  if (response.type != Process.THROUGHPUT) {
    throw Error("Did not get Process.Throughput type");
  }

  // Create a payload with the report title
  const report: ReportDataInput = {
    type: Process.THROUGHPUT,
    title: title,
    apSource: ap,
    hostDest: host,
    data: response.data,
  };

  // Create the report and add it to our persistent store
  return await createReport(report);
}

async function checkTitle(title: string): Promise<null> {
  await window.ipcRenderer.invoke("checkTitle", title);
  return null;
}

async function sendTrace(payload: Payload): Promise<ProcessingResponse> {
  const res: ProcessingResponse = await window.ipcRenderer.invoke(
    "request",
    payload
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

export async function deleteReport(id: string) {
  return await window.ipcRenderer.invoke("deleteReport", id);
}
