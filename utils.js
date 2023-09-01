const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os")

const EXTENSION_NAME = "ibank-extension";

function getSitePath() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME).get("sitePath");
}

function getContentPath() {
  return path.join(
    getSitePath(),
    vscode.workspace.getConfiguration(EXTENSION_NAME).get("contentDir")
  );
}

function getServerCommand() {
  return vscode.workspace.getConfiguration(EXTENSION_NAME).get("serverCommand")
}

function expandUserDir(inputPath) {
  const userHome = os.homedir()
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

function getDirs(baseDir) {
  const results = [];
  fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .forEach((entry) => {
      const aDir = path.resolve(baseDir, entry.name);
      results.push(aDir);
      getDirs(aDir).forEach((d) => results.push(d));
    });
  return results;
}

function outputDirItems(contentPath, defaultDir) {
  const targetPath = expandUserDir(contentPath);
  const list = getDirs(targetPath).map((d) => path.relative(targetPath, d));

  if (defaultDir) {
    const excluded = list.filter((d) => d !== defaultDir);
    return [defaultDir, ...excluded];
  } else {
    return list;
  }
}

module.exports = {
  getSitePath,
  getContentPath,
  getServerCommand,
  getRealPath,
  outputDirItems,
};
