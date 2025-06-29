import { ipcMain, app } from "electron";
import fs from "fs/promises";
import syncfs from "fs";
import path from "path";
import Store from "electron-store";

ipcMain.handle("getReports", async () => {
  return getReports();
});

ipcMain.handle("createReport", async (_event, report) => {
  return createReport(report);
});

interface DeviceInfo {
  sa: string;
  total_frames: number;
  total_snr: number;
  score: number;
}

interface Bin {
  devices: DeviceInfo[];
  total_devices_in_interval: number;
  total_frames_in_interval: number;
  avg_snr_in_interval: number;
  density_rating_in_interval: number;
  start_time: number;
  end_time: number;
}

interface DensityAnalysis {
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

export const getReports = async (): Promise<ReportData[]> => {
  const userDataDir = app.getPath("userData");
  const entries = await fs.readdir(userDataDir);

  // Find all the <name>_report.json files
  const jsonFiles = entries.filter((name) => name.endsWith("_report.json"));

  // For each filename, create a Store({ name }) pointing at that file
  const reports: ReportData[] = jsonFiles.map((filename) => {
    // Extract only the name without extension
    const name = path.basename(filename, ".json");

    // Create the store pointing to file
    const store = new Store<ReportData>({
      name,
    });

    // Create the ReportData object with a copy of store.store
    return structuredClone(store.store);
  });

  return reports;
};

export const createReport = async (
  input: ReportDataInput
): Promise<ReportData> => {
  // Make sure no illegal characters
  // remove any of \ / : * ? " < > |
  input.title = input.title.replace(/[\\/:*?"<>|]/g, "").trim();

  // Create ID based on title, removing spaces and lowering characters
  const id = `${input.title}_report`.toLowerCase().replace(/\s+/g, "_");

  // See if a file with that title already exists
  const userDataDir = app.getPath("userData");
  const filePath = path.join(userDataDir, `${id}.json`);
  if (syncfs.existsSync(filePath)) {
    throw new Error("Title already exists.");
  }

  // Point electron-store at userData/<id>.json
  const store = new Store<ReportDataInput>({
    name: id,
  });

  // Create new shape
  const report: ReportData = { id: id, ...input };

  // Write the data
  store.set(report);

  // Return the object shape your renderer expects
  return report;
};
