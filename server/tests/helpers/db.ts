import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { MongoBinary } from "mongodb-memory-server";
import mongoose from "mongoose";

// We use mongodb-memory-server only for MongoBinary (its cross-platform
// mongod download/cache resolver). Its higher-level MongoMemoryServer
// orchestration is NOT used — we spawn and verify readiness ourselves.
//
// Also worth recording: the mongodb driver's initial handshake ("Missing
// required sub-document 'driver' in the client metadata document") was
// verified to fail under Jest specifically — reproduced with the raw
// `mongodb` driver, with mongoose, and against two different mongod
// versions (7.0.14 and 8.2.6), always outside vs. inside Jest. That
// pointed at Jest's per-test-file VM realm (a well-known source of
// `instanceof`/Buffer-identity bugs in native/BSON-handling libraries),
// not a server-version issue — which is why this project's tests run on
// Vitest instead of Jest.
const MONGOD_VERSION = "8.2.6";

let child: ChildProcess | undefined;
let dbDir: string | undefined;

async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        const { port } = address;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Could not determine a free port")));
      }
    });
  });
}

function waitForReady(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("mongod did not report readiness within 20s"));
    }, 20000);

    let buffer = "";
    const onData = (chunk: Buffer): void => {
      buffer += chunk.toString();
      if (buffer.includes("Waiting for connections")) {
        cleanup();
        resolve();
      }
    };
    const onExit = (code: number | null): void => {
      if (code !== null && code !== 0) {
        cleanup();
        reject(new Error(`mongod exited early with code ${code}`));
      }
    };
    const onError = (err: Error): void => {
      cleanup();
      reject(err);
    };
    function cleanup(): void {
      clearTimeout(timeout);
      proc.stdout?.off("data", onData);
      proc.off("exit", onExit);
      proc.off("error", onError);
    }

    proc.stdout?.on("data", onData);
    proc.on("exit", onExit);
    proc.on("error", onError);
  });
}

export async function connectTestDB(): Promise<void> {
  const binaryPath = await MongoBinary.getPath({ version: MONGOD_VERSION });
  const port = await getFreePort();
  dbDir = fs.mkdtempSync(path.join(os.tmpdir(), "akedly-test-mongo-"));

  child = spawn(
    binaryPath,
    ["--port", String(port), "--dbpath", dbDir, "--bind_ip", "127.0.0.1", "--noauth"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  await waitForReady(child);
  await mongoose.connect(`mongodb://127.0.0.1:${port}/akedly_test`);
  // See db.ts's connectDB for why this matters: without it, unique-index
  // guarantees (idempotency, tenant-isolation-adjacent constraints) aren't
  // actually in effect for the first requests after connecting.
  await mongoose.syncIndexes();
}

export async function clearTestDB(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function disconnectTestDB(): Promise<void> {
  await mongoose.connection.close();

  if (child) {
    // Kill only the mongod process this file spawned, by its own PID
    // handle — never a system-wide taskkill by image name — and wait for
    // it to actually exit before touching its dbpath (Windows keeps its
    // WiredTiger files locked briefly after the process is killed).
    const exited = new Promise<void>((resolve) => {
      child?.once("exit", () => resolve());
    });
    child.kill();
    await exited;
    child = undefined;
  }

  if (dbDir) {
    // maxRetries/retryDelay as a safety net for any residual handle-release
    // lag beyond the process exit itself.
    fs.rmSync(dbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    dbDir = undefined;
  }
}
