const vscode = require("vscode");
const YAML = require('yaml')

const FM_SEPARATOR = "---"
function getFrontmatterRange(editor) {
  if (!editor) {
    vscode.window.showWarningMessage("テキストエディタを取得できません。")
    return null
  }
  if (editor.document.lineAt(0).text !== FM_SEPARATOR) {
    vscode.window.showWarningMessage("ファイルにFrontMatterがありません。")
    return null
  }
  const fmStart = editor.document.lineAt(0).range.end

  let fmEnd = null
  for(let i = 1; i < editor.document.lineCount; i++) {
    if (editor.document.lineAt(i).text === FM_SEPARATOR) {
      fmEnd = editor.document.lineAt(i).range.start
      break
    }
  }
  if (!fmEnd) {
    vscode.window.showWarningMessage("ファイルにFrontMatterの終了行がありません。")
    return null
  }

  const range = new vscode.Range(fmStart, fmEnd)
  return range
}

function getFrontmatter(editor, range) {
  const yamlStr = editor.document.getText(range);
  return YAML.parse(yamlStr);
}

async function updateFrontMatter(editor, data, forceSave=false) {
  const range = getFrontmatterRange(editor)
  if (range) {
    const obj = getFrontmatter(editor, range)
    for(let k in data) {
      obj[k] = data[k]
    }
    await editor.edit(builder => {
      builder.replace(range, `\n${YAML.stringify(obj)}`)
    })
    if (forceSave) {
      await editor.document.save()
    }
  }
}

module.exports = {
  getFrontmatterRange,
  getFrontmatter,
  updateFrontMatter
}
