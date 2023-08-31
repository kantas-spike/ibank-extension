// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process = require('child_process')


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const EXTENSION_NAME = "ibank-extension";
let serverOutputChannel
let serverProcess

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

function outputDirItems(contentPath, defaultDir) {
  const targetPath = expandUserDir(contentPath);
  const list = getDirs(targetPath).map((d) => path.relative(targetPath, d));

  if (defaultDir) {
    const excluded = list.filter(d => d !== defaultDir)
    return [defaultDir, ...excluded]
  } else {
    return list
  }
}


const terminalName = "Idea Bank"

function createIdeaBankTerminal() {
  const t = vscode.window.createTerminal({
    name: terminalName,
  });
  t.sendText(`cd ${getSitePath()}`, true);
  return t;
}

function openIdeaBankTerminal() {
  let t = vscode.window.terminals.filter(t => t.name === terminalName)[0]
  if (t) {
    return t
  } else {
    t = createIdeaBankTerminal();
    t.show();
    return t
  }
}

function runCommandInIdeaBankTerminal(command) {
  const t = openIdeaBankTerminal();
  t.sendText(command, true);
}

function getSimpleQuickInput(name, defaultDir, kind) {
  return async () => {
    const fileName = await vscode.window.showInputBox({
      title: `${name}の名前`,
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
      outputDirItems(getContentPath(), defaultDir),
      {
        canPickMany: false,
        title: `出力先フォルダの選択: デフォルトのフォルダ(${defaultDir})に格納する場合は[Esc]を押してください`,
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

function stopServerProcess() {
  if (serverProcess) {
    if(serverProcess.kill('SIGINT')) {
      serverProcess = null
    } else {
      vscode.window.showErrorMessage("サーバープロセスの終了に失敗しました")
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "ibank-extension" is now active!'
  );

  serverOutputChannel = vscode.window.createOutputChannel(terminalName)
  serverOutputChannel.show()

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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.startServer",
      async () => {
        const sitePath = getRealPath(getSitePath())
        const cmd = vscode.workspace.getConfiguration(EXTENSION_NAME).get("serverCommand")
        serverOutputChannel.appendLine(`sitePath: ${sitePath}`)
        serverOutputChannel.appendLine(`command: ${cmd}`)
        serverProcess = child_process.spawn(cmd, {"cwd": sitePath, shell: true})
        serverProcess.stdout.on('data', (data) => {
          serverOutputChannel.appendLine(data)
        })
        serverProcess.stderr.on('data', (data) => {
          serverOutputChannel.appendLine(data)
        })
        serverProcess.on('close', (code) => {
          serverOutputChannel.appendLine(`child process exited with code: ${code}`)
        })
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "ibank-extension.stopServer",
      async () => {
        stopServerProcess()
      }
    )
  );
}

// This method is called when your extension is deactivated
function deactivate() {
  stopServerProcess()
  serverOutputChannel.dispose()
}

module.exports = {
  activate,
  deactivate,
};
