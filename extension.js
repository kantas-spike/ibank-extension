// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

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

const userHome =
  process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
function expandUserDir(inputPath) {
  const tilde_slash = /^~\//;
  const tilde_only = /^~[^\\]/;
  if (inputPath.match(tilde_slash)) {
    return path.join(userHome, inputPath.replace(tilde_slash, ""));
  } else if (inputPath.match(tilde_only)) {
    return path.join(userHome, inputPath.replace(tilde_only, ""));
  } else {
    inputPath;
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

function outputDirItems(contentPath) {
  const targetPath = expandUserDir(contentPath);
  return getDirs(targetPath).map((d) => path.relative(targetPath, d));
}

function createIdeaBankTerminal() {
  const t = vscode.window.createTerminal({
    name: "Idea Bank",
  });
  t.sendText(`cd ${getSitePath()}`, true);
  return t;
}

function openIdeaBankTerminal() {
  if (!ibankTerminal || ibankTerminal.exitStatus) {
    ibankTerminal = createIdeaBankTerminal();
    ibankTerminal.show();
  }
}

function runCommandInIdeaBankTerminal(command) {
  openIdeaBankTerminal();
  ibankTerminal.sendText(command, true);
}

function disposeIdeaBankTerminal() {
  if (ibankTerminal && !ibankTerminal.exitStatus) {
    ibankTerminal.dispose();
  }
}

function getSimpleQuickInput(name, defaultDir, kind) {
  return async () => {
    // The code you place here will be executed every time your command is executed
    let prompt = `${name}を記載するファイル名(拡張子不要)を入力してください`;
    if (kind === "idea-bundle") {
      prompt = `${name}を記載するフォルダ名を入力してください`;
    }

    const fileName = await vscode.window.showInputBox({
      prompt,
      validateInput: (input) => {
        if (input.includes(" ")) {
          return "名前に空白は使用できません";
        } else if (input.match(/[\\¥\/:*?"<>|]/g)) {
          return '名前に次の文字は使用できません: \\ ¥ / : * ? " < > |';
        } else {
          return null;
        }
      },
    });
    let itemName;
    if (kind === "idea-bundle") {
      if (fileName) {
        itemName = `${fileName}`;
      } else {
        vscode.window.showErrorMessage("フォルダ名を選択してください");
        return;
      }
    } else {
      if (fileName) {
        itemName = `${fileName}.md`;
      } else {
        vscode.window.showErrorMessage("ファイル名を選択してください");
        return;
      }
    }
    const outputFolder = await vscode.window.showQuickPick(
      outputDirItems(getContentPath()),
      {
        canPickMany: false,
        title: `${name}を格納するフォルダを選択してください。選択しない場合は[Esc]を押してください`,
      }
    );
    const defaultOutputDir = defaultDir;
    let outputPath;
    if (outputFolder) {
      outputPath = path.join(outputFolder, itemName);
    } else {
      vscode.window.showInformationMessage(
        `フォルダが選択されなかったため、デフォルトディレクトリ(${defaultOutputDir})に格納します。`
      );
      outputPath = path.join(defaultOutputDir, itemName);
    }

    // vscode.window.showInformationMessage(`${path.join(getContentPath(), outputPath)} を作成します...: ${contentExists(path.join(getContentPath(), outputPath))}`);
    const realPath = getRealPath(path.join(getContentPath(), outputPath));
    if (fs.existsSync(realPath)) {
      vscode.window.showErrorMessage(`${outputPath}は既に作成済みです`);
      return;
    }

    vscode.window.showInformationMessage(`${outputPath} を作成します`);

    const command = `hugo new content -k ${kind} "${outputPath}" --editor code`;
    runCommandInIdeaBankTerminal(command);
    if (kind === "idea-bundle") {
      runCommandInIdeaBankTerminal(`code ${realPath}/_index.md`);
    }
  };
}

let ibankTerminal;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "ibank-extension" is now active!'
  );

  openIdeaBankTerminal();

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.addIdea",
      getSimpleQuickInput("アイデア", "ideas", "idea")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.addIdeaBundle",
      getSimpleQuickInput("アイデア", "ideas", "idea-bundle")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.addStone",
      getSimpleQuickInput("自然石", "fieldstones", "fieldstone")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.addTil",
      getSimpleQuickInput("TIL", "til", "til")
    )
  );
}

// This method is called when your extension is deactivated
function deactivate() {
  disposeIdeaBankTerminal();
}

module.exports = {
  activate,
  deactivate,
};
