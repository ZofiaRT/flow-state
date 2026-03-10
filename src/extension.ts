// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let lastFile: string | undefined;
	let lastFolder: string | undefined;
	let lastEditorGroup: number | undefined;

	let switchTimestamps: number[] = [];

	const WINDOW_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
	const SWITCH_THRESHOLD = 8;           
	const WARNING_COOLDOWN = 5 * 60 * 1000; // 5 minutes cooldown between warnings
	let lastWarningTime = 0;  

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "flow-state" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	//const disposable = vscode.commands.registerCommand('flow-state.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World from Flow-State!');
	//});

	//context.subscriptions.push(disposable);

	// Enforces rolling window and triggers warning
	function recordContextSwitch() {
		const now = Date.now();

		switchTimestamps.push(now);

		switchTimestamps = switchTimestamps.filter(t => now - t < WINDOW_DURATION);

		if (switchTimestamps.length >= SWITCH_THRESHOLD && now - lastWarningTime > WARNING_COOLDOWN) {
			vscode.window.showInformationMessage(
				"Frequent context switching detected in the last 10 minutes. Try focusing on one task."
			);
			lastWarningTime = now;
		}

		console.log("Context switches in last 10 min:", switchTimestamps.length);
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		// No active editor
		if (!editor) {return;}

		const filePath = editor.document.uri.fsPath;
		const folder = path.dirname(filePath);
		const group = editor.viewColumn;

		// Detect file switch
		if (lastFile && filePath !== lastFile) {
			console.log("File switch detected");
			recordContextSwitch();
		}

		// Detect folder/module switch
		if (lastFolder && folder !== lastFolder) {
			console.log("Folder/module switch detected");
			recordContextSwitch();
		}

		// Detect editor group switch
		if (lastEditorGroup !== undefined && group !== lastEditorGroup) {
			console.log("Editor group switch detected");
			recordContextSwitch();
		}

		lastFile = filePath;
		lastFolder = folder;
		lastEditorGroup = group;
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
