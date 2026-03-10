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

	let contextSwitchCount = 0;

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
	vscode.window.onDidChangeActiveTextEditor(editor => {

		if (!editor) return;

		const filePath = editor.document.uri.fsPath;
		const folder = path.dirname(filePath);
		const group = editor.viewColumn;

		// File switch
		if (lastFile && filePath !== lastFile) {
			contextSwitchCount++;
			console.log("File switch detected");
		}

		// Folder/module switch
		if (lastFolder && folder !== lastFolder) {
			contextSwitchCount++;
			console.log("Folder switch detected");
		}

		// Editor group switch
		if (lastEditorGroup !== undefined && group !== lastEditorGroup) {
			contextSwitchCount++;
			console.log("Editor group switch detected");
		}

		if (contextSwitchCount >= 10) {

			vscode.window.showInformationMessage(
				"Frequent context switching detected. Try focusing on one task."
			);

			contextSwitchCount = 0;
		}

		console.log("Total context switches:", contextSwitchCount);

		lastFile = filePath;
		lastFolder = folder;
		lastEditorGroup = group;
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}
