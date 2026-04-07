import * as assert from 'assert';
import { pathToFileURL } from 'url';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { restoreOriginalImageSources } from '../extension';

suite('Extension Test Suite', function () {
	this.timeout(10000);

	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Restores relative markdown image sources for browser export', () => {
		const resourceUri = vscode.Uri.file('/workspace/docs/readme.md');
		const base = pathToFileURL(vscode.Uri.joinPath(resourceUri, '..').fsPath).toString();
		const expected = new URL(
			'images/diagram.png?cache=1#section',
			base.endsWith('/') ? base : `${base}/`
		).toString();

		const html = restoreOriginalImageSources(
			'<p><img src="vscode-webview://preview/image.png" data-src="images/diagram.png?cache=1#section" alt="diagram"></p>',
			resourceUri
		);

		assert.ok(html.includes(`src="${expected}"`));
		assert.ok(html.includes('data-src="images/diagram.png?cache=1#section"'));
	});

	test('Uses browser-style file URLs for local markdown image sources', () => {
		const resourceUri = vscode.Uri.file('D:/workspace/docs/readme.md');
		const html = restoreOriginalImageSources(
			'<img src="vscode-webview://preview/image.png" data-src="../assets/Screenshot.png">',
			resourceUri
		);

		assert.match(html, /src="file:\/\/\/[dD]:\/workspace\/assets\/Screenshot\.png"/);
		assert.ok(!html.includes('file:///d%3A/'));
	});

	test('Escapes restored markdown image sources', () => {
		const resourceUri = vscode.Uri.file('/workspace/docs/readme.md');
		const html = restoreOriginalImageSources(
			'<img src="vscode-webview://preview/image.png" data-src="https://example.com/a.png?x=1&amp;y=2">',
			resourceUri
		);

		assert.ok(html.includes('src="https://example.com/a.png?x=1&amp;y=2"'));
	});

	test('Renders markdown through the VS Code markdown API', async () => {
		const document = await vscode.workspace.openTextDocument({
			content: '# Exported Preview',
			language: 'markdown',
		});

		const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);

		assert.strictEqual(typeof html, 'string');
		assert.ok(html.includes('Exported Preview'));
		assert.ok(html.includes('<h1'));
	});
});
