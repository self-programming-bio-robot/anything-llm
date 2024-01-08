const fs = require("fs");
const path = require("path");

function trashFile(filepath) {
  if (!fs.existsSync(filepath)) return;

  try {
    const isDir = fs.lstatSync(filepath).isDirectory();
    if (isDir) return;
  } catch {
    return;
  }

  fs.rmSync(filepath);
  return;
}

function createdDate(filepath) {
  try {
    const { birthtimeMs, birthtime } = fs.statSync(filepath);
    if (birthtimeMs === 0) throw new Error("Invalid stat for file!");
    return birthtime.toLocaleString();
  } catch {
    return "unknown";
  }
}

function writeToServerDocuments(
  data = {},
  filename,
  destinationOverride = null
) {
  const destination = destinationOverride
    ? path.resolve(destinationOverride)
    : path.resolve(
        __dirname,
        "../../../server/storage/documents/custom-documents"
      );
  if (!fs.existsSync(destination))
    fs.mkdirSync(destination, { recursive: true });
  const destinationFilePath = path.resolve(destination, filename);

  fs.writeFileSync(
    destinationFilePath + ".json",
    JSON.stringify(data, null, 4),
    { encoding: "utf-8" }
  );
  return;
}

// When required we can wipe the entire collector hotdir and tmp storage in case
// there were some large file failures that we unable to be removed a reboot will
// force remove them.
async function wipeCollectorStorage() {
  const cleanHotDir = new Promise((resolve) => {
    if (process.env.NODE_ENV !== "development") {
      const dir = path.resolve(process.env.STORAGE_DIR, `collector/hotdir`);
      console.log("Creating hotdir directory if it doesn't exist.");
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Copy placeholder file to hotdir(${dir}) directory.`);
      fs.copyFileSync(
        path.resolve(__dirname, "../../hotdir/__HOTDIR__.md"),
        path.resolve(dir, "__HOTDIR__.md")
      );
    }

    const directory = process.env.NODE_ENV === "development"
      ? path.resolve(__dirname, "../../hotdir")
      : path.resolve(process.env.STORAGE_DIR, `collector/hotdir`);

    fs.readdir(directory, (err, files) => {
      if (err) resolve();

      for (const file of files) {
        if (file === "__HOTDIR__.md") continue;
        try {
          fs.rmSync(path.join(directory, file));
        } catch {}
      }
      resolve();
    });
  });

  const cleanTmpDir = new Promise((resolve) => {
    const directory = path.resolve(__dirname, "../../storage/tmp");
    fs.readdir(directory, (err, files) => {
      if (err) resolve();

      for (const file of files) {
        if (file === ".placeholder") continue;
        try {
          fs.rmSync(path.join(directory, file));
        } catch {}
      }
      resolve();
    });
  });

  await Promise.all([cleanHotDir, cleanTmpDir]);
  console.log(`Collector hot directory and tmp storage wiped!`);
  return;
}

module.exports = {
  trashFile,
  createdDate,
  writeToServerDocuments,
  wipeCollectorStorage,
};
