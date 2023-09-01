const assert = require('assert');
const utils = require('../../utils')
const path = require('path')
const vscode = require("vscode")

suite('Extension Test Suite', () => {
	let settings = vscode.workspace.getConfiguration("ibank-extension");
	test('utils.getSitePath', async () => {
		assert.strictEqual("~/ibank", utils.getSitePath())
	})

	test('utils.getContentPath', () => {
		assert.strictEqual("~/ibank/content", utils.getContentPath())
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
		const contentPth = path.resolve(`${__dirname}/assets/content`)
		let list = utils.outputDirItems(contentPth, "ideas")
		assert.strictEqual(4, list.length)
		assert.strictEqual("ideas", list[0])

		list = utils.outputDirItems(contentPth, "til")
		assert.strictEqual(4, list.length)
		assert.strictEqual("til", list[0])

		list = utils.outputDirItems(contentPth, "fieldstones")
		assert.strictEqual(4, list.length)
		assert.strictEqual("fieldstones", list[0])
	})



});