import { ipcMain, app } from "electron";
import fs from "fs/promises";
import syncfs from "fs";
import path from "path";
import Store from "electron-store";
import { createError, Errors, Process, serializeError } from "../src/types";
import {
  ReportData,
  ReportDataInput,
} from "../src/types";

ipcMain.handle("getReports", async () => {
  try {
    return await getReports();
  } catch (err) {
    throw serializeError(err);
  }
});

ipcMain.handle("createReport", async (_event, report) => {
  try {
    return await createReport(report);
  } catch (err) {
    throw serializeError(err);
  }
});

ipcMain.handle("checkTitle", async (_event, title) => {
  try {
    checkTitle(title);
  } catch (err) {
    throw serializeError(err);
  }
});

ipcMain.handle("deleteReport", async (_event, id) => {
  try {
    await deleteReport(id);
  } catch (err) {
    throw serializeError(err);
  }
});

const getReports = async (): Promise<ReportData[]> => {
  const userDataDir = app.getPath("userData");
  const entries = await fs.readdir(userDataDir);

  // Find all the <name>_report.json files
  const jsonFiles = entries.filter((name) => name.endsWith("_report.json"));

  // For each filename, create a Store({ name }) pointing at that file
  const reports: ReportData[] = jsonFiles
    .map((filename) => {
      // Extract only the name without extension
      const name = path.basename(filename, ".json");

      // Create the store pointing to file
      const store = new Store<ReportData>({
        name,
      });

      // Create the ReportData object with a copy of store.store
      try {
        return structuredClone(store.store);
      } catch (err) {
        console.warn(`Failed to clone report ${name}:`, err);
        // Null responses will be filtered out
        return null;
      }
    })
    .filter((r): r is ReportData => r !== null);

  return reports;
};

const createReport = async (input: ReportDataInput): Promise<ReportData> => {
  // Make sure no illegal characters
  // remove any of \ / : * ? " < > |
  input.title = input.title.replace(/[\\/:*?"<>|]/g, "").trim();

  // Create ID based on title, removing spaces and lowering characters
  const id = `${input.title}_report`.toLowerCase().replace(/\s+/g, "_");

  // See if a file with that title already exists
  const userDataDir = app.getPath("userData");
  const filePath = path.join(userDataDir, `${id}.json`);
  if (syncfs.existsSync(filePath)) {
    throw createError("Title already exists.", Errors.TITLE_EXITST);
  }

  // Point electron-store at userData/<id>.json
  const store = new Store<ReportData>({
    name: id,
  });

  // Create new shape
  const report: ReportData =
    input.type == Process.DENSITY
      ? {
          id: id,
          title: input.title,
          date: new Date(),
          type: Process.DENSITY,
          density: input.data,
        }
      : {
          id: id,
          title: input.title,
          date: new Date(),
          apSource: input.apSource,
          hostDest: input.hostDest,
          type: Process.THROUGHPUT,
          throughput: input.data,
        };

  // Write the data
  store.set(report);

  // Return the object shape your renderer expects
  return report;
};

const deleteReport = async (id: string) => {
  const userDataDir = app.getPath("userData");
  const filePath = path.join(userDataDir, `${id}.json`);

  // If it doesn't exist, throw a custom error
  if (!syncfs.existsSync(filePath)) {
    return;
  }

  // Remove the JSON file
  await fs.unlink(filePath);
};

const checkTitle = (title: string) => {
  // Make sure no illegal characters
  // remove any of \ / : * ? " < > |
  title = title.replace(/[\\/:*?"<>|]/g, "").trim();

  // Create ID based on title, removing spaces and lowering characters
  const id = `${title}_report`.toLowerCase().replace(/\s+/g, "_");

  // See if a file with that title already exists
  const userDataDir = app.getPath("userData");
  const filePath = path.join(userDataDir, `${id}.json`);
  if (syncfs.existsSync(filePath)) {
    throw createError("Title already exists.", Errors.TITLE_EXITST);
  }
};
