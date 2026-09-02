import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { storePaths } from "../core/store.mjs";

const sourceWebDirectory = fileURLToPath(
  new URL("../../web/", import.meta.url),
);

async function copyIfPresent(source, destination) {
  try {
    await access(source);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    return true;
  } catch {
    return false;
  }
}

function portableCheckpoint(checkpoint, assetMap) {
  const copy = structuredClone(checkpoint);
  if (copy.visual?.before?.image)
    copy.visual.before.image = assetMap.get(copy.visual.before.image) || null;
  if (copy.visual?.after?.image)
    copy.visual.after.image = assetMap.get(copy.visual.after.image) || null;
  if (copy.analysis?.visual?.pixel?.diffImage) {
    copy.analysis.visual.pixel.diffImage =
      assetMap.get(copy.analysis.visual.pixel.diffImage) || null;
  }
  if (copy.before) delete copy.before.ref;
  if (copy.after) delete copy.after.ref;
  return copy;
}

export async function generateReport(root, checkpoints, selectedId) {
  const selected =
    checkpoints.find((checkpoint) => checkpoint.id === selectedId) ||
    checkpoints[0];
  if (!selected)
    throw new Error("There are no completed checkpoints to report.");
  const reportDirectory = join(storePaths(root).reports, selected.id);
  const assetDirectory = join(reportDirectory, "assets");
  await mkdir(assetDirectory, { recursive: true });

  for (const name of ["index.html", "styles.css", "app.js"]) {
    await copyFile(join(sourceWebDirectory, name), join(reportDirectory, name));
  }

  const assetMap = new Map();
  for (const checkpoint of checkpoints) {
    const sources = [
      checkpoint.visual?.before?.image,
      checkpoint.visual?.after?.image,
      checkpoint.analysis?.visual?.pixel?.diffImage,
    ].filter(Boolean);
    for (const source of sources) {
      const destinationName = `${checkpoint.id}-${basename(source)}`;
      const destination = join(assetDirectory, destinationName);
      const sourcePath = isAbsolute(source) ? source : join(root, source);
      if (await copyIfPresent(sourcePath, destination))
        assetMap.set(source, `./assets/${destinationName}`);
    }
  }

  const payload = {
    mode: "report",
    selectedId: selected.id,
    generatedAt: new Date().toISOString(),
    checkpoints: checkpoints.map((checkpoint) =>
      portableCheckpoint(checkpoint, assetMap),
    ),
  };
  await writeFile(
    join(reportDirectory, "report-data.js"),
    `window.__VIBETRACE_REPORT__ = ${JSON.stringify(payload, null, 2)};\n`,
    "utf8",
  );

  let html = await readFile(join(reportDirectory, "index.html"), "utf8");
  html = html.replace(
    '<script type="module" src="./app.js"></script>',
    '<script src="./report-data.js"></script>\n  <script type="module" src="./app.js"></script>',
  );
  await writeFile(join(reportDirectory, "index.html"), html, "utf8");

  return {
    directory: reportDirectory,
    index: join(reportDirectory, "index.html"),
    relativeIndex: relative(root, join(reportDirectory, "index.html")),
  };
}
