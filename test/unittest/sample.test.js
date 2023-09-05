const assert = require('assert');
const utils = require('../../utils')
const path = require('path')
const vscode = require("vscode")
const fs = require('fs')

suiteSetup(async () => {
	console.log("suiteSetup!!", vscode.workspace.workspaceFolders[0].uri.fsPath)
	const settings = vscode.workspace.getConfiguration("ibank-extension");
	await settings.update("sitePath", vscode.workspace.workspaceFolders[0].uri.fsPath)
	console.log("  update sitePath: ", settings.get("sitePath"))
	const contentDir = path.resolve(path.join(__dirname, "../assets/sample/content"))
	console.log(`clear ${contentDir}...`)
	fs.rmSync(contentDir, {recursive: true, force: true})
	console.log(`remkdir ${contentDir}...`)
	fs.mkdirSync(contentDir)
	console.log(`create _index.md...`)
	fs.writeFileSync(path.join(contentDir, "_index.md"), "これはテスト用のサンプルサイトです。")
})

suite('Extension Test Suite', () => {
	let settings = vscode.workspace.getConfiguration("ibank-extension");
	test('utils.getSitePath', async () => {
		assert.strictEqual(vscode.workspace.workspaceFolders[0].uri.fsPath, utils.getSitePath())
	})

	test('utils.getContentPath', () => {
		assert.strictEqual(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "content"), utils.getContentPath())
	})

	test('utils.getServerCommand', () => {
		assert.strictEqual(settings.get("serverCommand"), utils.getServerCommand())
	})

	test('utils.getRealPath', () => {
		assert.strictEqual("/Users/kanta/test", utils.getRealPath("~/test"));
		assert.strictEqual("/Users/kanta", utils.getRealPath("~"));
		assert.strictEqual("/Users/kanta/test", utils.getRealPath("/Users/kanta/test"));
	});

	test('outputDirItems', () => {
		const contentPth = path.resolve(`${__dirname}/../assets/sample/content`)
		let list = utils.outputDirItems(contentPth, "ideas")
		assert.strictEqual(3, list.length)
		assert.strictEqual("ideas", list[0])

		list = utils.outputDirItems(contentPth, "til")
		assert.strictEqual(3, list.length)
		assert.strictEqual("til", list[0])

		list = utils.outputDirItems(contentPth, "fieldstones")
		assert.strictEqual(3, list.length)
		assert.strictEqual("fieldstones", list[0])
	})



});