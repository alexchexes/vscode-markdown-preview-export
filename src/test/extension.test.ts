import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { getBesideMarkdownOutputUri, restoreOriginalImageSources } from '../extension';

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
		const resourceUri = vscode.Uri.file(
			path.join(os.tmpdir(), 'workspace', 'docs', 'readme.md')
		);
		const expected = pathToFileURL(
			path.join(os.tmpdir(), 'workspace', 'assets', 'Screenshot.png')
		).toString();
		const html = restoreOriginalImageSources(
			'<img src="vscode-webview://preview/image.png" data-src="../assets/Screenshot.png">',
			resourceUri
		);

		if (process.platform === 'win32') {
			assert.ok(html.toLowerCase().includes(`src="${expected}"`.toLowerCase()));
		} else {
			assert.ok(html.includes(`src="${expected}"`));
		}
		assert.ok(!html.includes('file:///d%3A/'));
	});

	test('Builds beside-markdown output file URI', () => {
		const expected = path.join(os.tmpdir(), 'workspace', 'docs', 'readme.html');
		const sourceUri = vscode.Uri.file(
			path.join(os.tmpdir(), 'workspace', 'docs', 'readme.md')
		);
		const outputUri = getBesideMarkdownOutputUri(sourceUri);

		assert.strictEqual(outputUri?.scheme, 'file');
		if (process.platform === 'win32') {
			assert.strictEqual(outputUri?.fsPath.toLowerCase(), expected.toLowerCase());
		} else {
			assert.strictEqual(outputUri?.fsPath, expected);
		}
	});

	test('Does not build beside-markdown output URI for untitled documents', () => {
		const outputUri = getBesideMarkdownOutputUri(vscode.Uri.parse('untitled:Untitled-1'));

		assert.strictEqual(outputUri, undefined);
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
