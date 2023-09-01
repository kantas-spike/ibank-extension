// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process = require('child_process')
const utils = require("./utils")


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

let serverOutputChannel
let serverProcess

const terminalName = "Idea Bank"

function createIdeaBankTerminal() {
  const t = vscode.window.createTerminal({
    name: terminalName,
  });
  t.sendText(`cd ${utils.getSitePath()}`, true);
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
      title: `${name}の名前入力:`,
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
      utils.outputDirItems(utils.getContentPath(), defaultDir),
      {
        canPickMany: false,
        title: `出力先フォルダの選択:`,
      }
    );

    let outputPath;
    if (outputFolder) {
      outputPath = path.join(outputFolder, itemName);
    } else {
      vscode.window.showErrorMessage("出力フォルダを選択してください");
      return;
    }

    // vscode.window.showInformationMessage(`${path.join(getContentPath(), outputPath)} を作成します...: ${contentExists(path.join(getContentPath(), outputPath))}`);
    const realPath = utils.getRealPath(path.join(utils.getContentPath(), outputPath));
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
  } else {
    vscode.window.showWarningMessage("サーバーは起動していません")
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

  serverOutputChannel = vscode.window.createOutputChannel(terminalName, {log: true})
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
        const sitePath = utils.getRealPath(utils.getSitePath())
        const cmd = utils.getServerCommand()
        serverOutputChannel.appendLine(`sitePath: ${sitePath}`)
        serverOutputChannel.appendLine(`command: ${cmd}`)
        serverProcess = child_process.spawn(cmd, {"cwd": sitePath, shell: true})
        serverProcess.stdout.on('data', (data) => {
          serverOutputChannel.appendLine(data.toString())
        })
        serverProcess.stderr.on('data', (data) => {
          serverOutputChannel.appendLine(data.toString())
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
