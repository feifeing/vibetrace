import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { CONFIG_SCHEMA_VERSION, assertValidCheckpoint } from "./schema.mjs";
import { createId } from "./id.mjs";
import {
  runtimeChangeContract,
  setRuntimeChangeContract,
} from "./contract.mjs";
import { createEvidenceReceipt } from "./receipt.mjs";
import { runGit } from "../git/git.mjs";

export function storePaths(root) {
  const directory = join(root, ".vibetrace");
  return {
    directory,
    config: join(directory, "config.json"),
    state: join(directory, "state.json"),
    checkpoints: join(directory, "checkpoints"),
    sessions: join(directory, "sessions"),
    artifacts: join(directory, "artifacts"),
    reports: join(directory, "reports"),
  };
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw new Error(`Could not read ${path}: ${error.message}`);
  }
}

async function writeJsonAtomic(path, value) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

async function ensureLocalExclude(root) {
  const discoveredPath = runGit(root, [
    "rev-parse",
    "--git-path",
    "info/exclude",
  ]).trim();
  const excludePath = isAbsolute(discoveredPath)
    ? discoveredPath
    : resolve(root, discoveredPath);
  let existing = "";
  try {
    existing = await readFile(excludePath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const lines = existing.split(/\r?\n/u);
  if (!lines.includes("/.vibetrace/")) {
    const separator = existing && !existing.endsWith("\n") ? "\n" : "";
    await writeFile(
      excludePath,
      `${existing}${separator}/.vibetrace/\n`,
      "utf8",
    );
  }
}

export async function initializeStore(root) {
  const paths = storePaths(root);
  await Promise.all(
    [
      paths.directory,
      paths.checkpoints,
      paths.sessions,
      paths.artifacts,
      paths.reports,
    ].map((path) => mkdir(path, { recursive: true })),
  );
  await ensureLocalExclude(root);

  let config = await readJson(paths.config);
  let created = false;
  if (!config) {
    const now = new Date().toISOString();
    config = {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      currentSessionId: createId("session"),
      createdAt: now,
      visual: { viewport: { width: 1440, height: 900 }, waitMs: 350 },
    };
    await writeJsonAtomic(paths.config, config);
    await writeJsonAtomic(paths.state, {
      schemaVersion: 1,
      activeCheckpointId: null,
    });
    await writeJsonAtomic(
      join(paths.sessions, `${config.currentSessionId}.json`),
      {
        schemaVersion: 1,
        id: config.currentSessionId,
        createdAt: now,
        updatedAt: now,
        checkpoints: [],
      },
    );
    created = true;
  }
  return { paths, config, created };
}

export async function loadStore(root) {
  const initialized = await initializeStore(root);
  const state = await readJson(initialized.paths.state, {
    schemaVersion: 1,
    activeCheckpointId: null,
  });
  return { ...initialized, state };
}

export async function saveState(root, state) {
  await writeJsonAtomic(storePaths(root).state, state);
}

export async function createSession(root, name = null) {
  const { paths, config } = await loadStore(root);
  const now = new Date().toISOString();
  const session = {
    schemaVersion: 1,
    id: createId("session"),
    name: name?.trim() || null,
    createdAt: now,
    updatedAt: now,
    checkpoints: [],
  };
  config.currentSessionId = session.id;
  config.updatedAt = now;
  await writeJsonAtomic(paths.config, config);
  await writeJsonAtomic(join(paths.sessions, `${session.id}.json`), session);
  return session;
}

export async function loadSession(root, id) {
  const session = await readJson(join(storePaths(root).sessions, `${id}.json`));
  if (!session) throw new Error(`Session ${id} was not found.`);
  return session;
}

export async function saveCheckpoint(root, checkpoint) {
  if (!checkpoint.authorization) {
    checkpoint.authorization = runtimeChangeContract();
  }
  if (
    checkpoint.status === "completed" &&
    checkpoint.before?.commit &&
    checkpoint.after?.commit &&
    checkpoint.analysis
  ) {
    const storedVersion = checkpoint.receipt?.evidence?.version;
    checkpoint.receipt = createEvidenceReceipt(
      checkpoint,
      storedVersion ? { version: storedVersion } : undefined,
    );
  }
  assertValidCheckpoint(checkpoint);
  const paths = storePaths(root);
  await mkdir(paths.checkpoints, { recursive: true });
  await writeJsonAtomic(
    join(paths.checkpoints, `${checkpoint.id}.json`),
    checkpoint,
  );
}

export async function loadCheckpoint(root, id) {
  const checkpoint = await readJson(
    join(storePaths(root).checkpoints, `${id}.json`),
  );
  if (!checkpoint) throw new Error(`Checkpoint ${id} was not found.`);
  const validated = assertValidCheckpoint(checkpoint);
  setRuntimeChangeContract(validated.authorization || null);
  return validated;
}

export async function deleteCheckpoint(root, id) {
  await rm(join(storePaths(root).checkpoints, `${id}.json`), { force: true });
}

export async function listCheckpoints(root) {
  const paths = storePaths(root);
  let names = [];
  try {
    names = (await readdir(paths.checkpoints)).filter((name) =>
      name.endsWith(".json"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const checkpoints = await Promise.all(
    names.map((name) => readJson(join(paths.checkpoints, name))),
  );
  return checkpoints
    .filter(Boolean)
    .sort((left, right) =>
      String(right.createdAt).localeCompare(String(left.createdAt)),
    );
}

export async function appendCheckpointToSession(root, sessionId, checkpointId) {
  const paths = storePaths(root);
  const sessionPath = join(paths.sessions, `${sessionId}.json`);
  const session = (await readJson(sessionPath)) || {
    schemaVersion: 1,
    id: sessionId,
    createdAt: new Date().toISOString(),
    checkpoints: [],
  };
  if (!session.checkpoints.includes(checkpointId))
    session.checkpoints.push(checkpointId);
  session.updatedAt = new Date().toISOString();
  await writeJsonAtomic(sessionPath, session);
}

export async function removeCheckpointFromSession(
  root,
  sessionId,
  checkpointId,
) {
  const paths = storePaths(root);
  const sessionPath = join(paths.sessions, `${sessionId}.json`);
  const session = await readJson(sessionPath);
  if (!session) return;
  session.checkpoints = session.checkpoints.filter((id) => id !== checkpointId);
  session.updatedAt = new Date().toISOString();
  await writeJsonAtomic(sessionPath, session);
}
