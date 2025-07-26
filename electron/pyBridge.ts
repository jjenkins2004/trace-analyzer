import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ipcMain } from "electron";
import { app } from "electron";
import fs from "fs";

import {
  createError,
  Errors,
  ProcessingResponse,
  serializeError,
} from "../src/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let proc: ChildProcessWithoutNullStreams;

if (!app.isPackaged) {
  // Create the python process, by running the equiv of activating the virtual environment then running python3 `path/main.py`.
  // Also check if the virtual environment is created because we use that python binary to execute our process, that way we have installed modules
  // The pipe, pipe, pipe stuff creates pipes between the python stdIOs with our stdIOs
  const pythonExe = path.join(
    __dirname,
    "..",
    "core",
    ".venv",
    "bin",
    "python3.13"
  );
  if (!fs.existsSync(pythonExe)) {
    throw new Error(
      `Python executable not found at ${pythonExe}. Create a python virtual environment named '.venv' in the core folder, and install requirements.txt`
    );
  }
  proc = spawn(pythonExe, [path.join(__dirname, "../core/main.py")], {
    stdio: ["pipe", "pipe", "pipe"],
  });
} else {
  // in production, use the packaged binary file
  const exePath = path.join(process.resourcesPath, "backend", "main");

  if (!fs.existsSync(exePath)) {
    throw new Error(`executable not found at ${exePath}. `);
  }

  proc = spawn(exePath, [], {
    stdio: ["pipe", "pipe", "pipe"],
  });
}
proc.stderr.on("data", (chunk) => {
  console.error("Python stderr:", chunk.toString());
});
proc.on("exit", (code, signal) => {
  console.error(`Python exited (code=${code}, signal=${signal})`);
});

// Create a readline interface on proc.stdout (where our python process will write to),
// which makes sure what we get is the full message until a '\n'
const rl = createInterface({ input: proc.stdout });

// Create an interface for requesting with a payload and awaiting the response
export async function request(payload: object) {
  // Write our payload to the python process
  proc.stdin.write(JSON.stringify(payload) + "\n");

  // Return an unresolved promise which will either reject or resolve
  // based on the response of our python process
  return new Promise((resolve, reject) => {
    // Define our action on receiving a line
    const onLine = (line: string) => {
      cleanup();
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (e) {
        console.log(e);
        reject(
          createError(
            "Processing returned an unexpected response",
            Errors.PROCESSING_ERROR
          )
        );
      }
      if (msg.error) {
        if (msg.code && msg.code == "NO_FRAMES") {
          reject(createError(msg.error, Errors.NO_DATA));
        }
        reject(createError(msg.error, Errors.PROCESSING_ERROR));
      } else {
        resolve(msg as ProcessingResponse);
      }
    };

    // Cleanup both listeners & timer
    function cleanup() {
      clearTimeout(timer);
      rl.off("line", onLine);
    }

    // Create one-shot listener
    rl.once("line", onLine);

    // Timeout handler
    const timer = setTimeout(() => {
      cleanup();
      reject(
        createError(
          "Processing timed out, the file may be too large",
          Errors.TIME_OUT
        )
      );
    }, 60000);
  });
}

// Expose an api that our renderer can invoke
ipcMain.handle("request", async (_evt, payload) => {
  try {
    return await request(payload);
  } catch (err) {
    throw serializeError(err);
  }
});
