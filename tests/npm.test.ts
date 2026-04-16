// Test the library functions as expected when installed via npm.

import { spawn } from 'child_process';
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

// Steps:
// 1. Create a temporary directory for testing.
// 2. Initialize a new npm project and install the library.
// 3. Create a test script that imports the library and calls its functions.
// 4. Run the test script and check for expected output.

const runCommand = (command: string, args: string[], options = {}): Promise<string> =>
	new Promise((resolve, reject) => {
		const process = spawn(command, args, options);
		let stdout = '';
		let stderr = '';

		process.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		process.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		process.on('close', (code) => {
			if (code === 0) resolve(stdout);
			else
				reject(
					new Error(`Command failed with code ${code}: ${stderr}`)
				);
		});
	});

const runtimeCommand = process.env.NODE_BIN || process.execPath;
const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const createAndRunScript = async (script: string): Promise<{
	dir: string;
	run: () => Promise<string>;
	cleanup: () => Promise<void>;
}> => {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snipboard-test-'));
	// Initialize npm project
	await runCommand('npm', ['init', '-y'], { cwd: tempDir });

	// Install the library (assuming it's published to npm)
	await runCommand('npm', ['install', '@danieljohnbyns/snipboard'], { cwd: tempDir });

	// Create test script
	const scriptPath = path.join(tempDir, 'test.js');
	await fs.writeFile(scriptPath, script);

	return {
		run: () => runCommand(runtimeCommand, [scriptPath], { cwd: tempDir }),
		dir: tempDir,
		cleanup: () => fs.rm(tempDir, { recursive: true, force: true })
	};
};

test('npm install should work', async (t) => {
	const { run, cleanup } = await createAndRunScript(`
const { upload } = require('@danieljohnbyns/snipboard');
console.log(typeof upload);
	`);
	t.after(cleanup);

	const output = await run();
	assert.strictEqual(output.trim(), 'function', 'Expected upload to be a function');
});

test('upload function should return a string URL', async (t) => {
	const { run, dir, cleanup } = await createAndRunScript(`
const { upload } = require('@danieljohnbyns/snipboard');
const { promises: fs } = require('fs');
const path = require('path');

(async () => {
	const sampleImagePath = path.join(__dirname, 'sample.png');
	const sampleImage = await fs.readFile(sampleImagePath);
	const file = new File([sampleImage], 'sample.png', { type: 'image/png' });

	const url = await upload(file);
	console.log(url);
})();
	`);
	t.after(cleanup);

	// Copy fixtures/sample.png to the temporary directory
	const sampleImagePath = path.join(fixtureDir, 'sample.png');
	await fs.copyFile(sampleImagePath, path.join(dir, 'sample.png'));

	const output = await run();
	assert.match(output.trim(), /^https?:\/\/(?:i\.)?snipboard\.io\/\w+(?:\.\w+)?$/, 'Expected a valid snipboard URL');
});