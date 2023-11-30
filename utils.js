const vscode = require("vscode");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");

const EXTENSION_NAME = "ibank-extension";

function getSitePath() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME).get("sitePath");
}

function getContentPath() {
  return path.join(
    getSitePath(),
    vscode.workspace.getConfiguration(EXTENSION_NAME).get("contentDir"),
  );
}

function getServerCommand() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME).get("serverCommand");
}

function getServerPortNo() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME).get("serverPortNo");
}

function getExcludedDirNames() {
  return vscode.workspace
    .getConfiguration(EXTENSION_NAME)
    .get("excludedDirNames");
}

function expandUserDir(inputPath) {
  const userHome = os.homedir();
  const tilde_slash = /^~\//;
  if (inputPath.match(tilde_slash)) {
    return path.join(userHome, inputPath.replace(tilde_slash, ""));
  } else if (inputPath === "~") {
    return path.join(userHome, inputPath.replace("~", ""));
  } else {
    return inputPath;
  }
}

function getRealPath(inputPath) {
  return expandUserDir(inputPath);
}

const ITEM_DIRS = ["ideas", "fieldstones", "til"];

async function getDirs(baseDir, isRoot = true, ignoreDirNames = []) {
  const results = [];
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignoreDirNames.includes(entry.name)) {
        continue;
      }
      if (entry.isDirectory()) {
        const aDir = path.resolve(baseDir, entry.name);
        results.push(aDir);
        const subDirs = await getDirs(aDir, false, ignoreDirNames);
        results.push(...subDirs);
      } else if (entry.isSymbolicLink()) {
        const slink = path.resolve(baseDir, entry.name);
        const realPath = await fs.readlink(slink);
        const stat = await fs.lstat(realPath);
        if (stat.isDirectory()) {
          results.push(slink);
        }
      }
    }

    if (isRoot) {
      ITEM_DIRS.map((d) => path.join(baseDir, d)).forEach((d) => {
        if (!results.includes(d)) {
          results.push(d);
        }
      });
    }
  } catch (err) {
    console.error(err.message);
    throw new Error(`ディレクトリ一覧の取得に失敗しました。: ${err.message}`);
  }
  return results;
}

async function outputDirItems(contentPath, defaultDir, ignoreDirNames = []) {
  const targetPath = expandUserDir(contentPath);
  const list = await getDirs(targetPath, true, ignoreDirNames);

  const results = list.map((d) => path.relative(targetPath, d));

  if (defaultDir) {
    const excluded = results.filter((d) => d !== defaultDir);
    return [defaultDir, ...excluded];
  } else {
    return results;
  }
}

module.exports = {
  getSitePath,
  getContentPath,
  getServerPortNo,
  getExcludedDirNames,
  getServerCommand,
  getRealPath,
  outputDirItems,
};
