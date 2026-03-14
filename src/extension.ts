import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { StatusBar } from './StatusBar'
import { checkZombiePackages } from './zombiePackages';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();

    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar);
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(e => developerCognitiveLoadTracker.onEditorChanged(e));
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => developerCognitiveLoadTracker.onDocumentChanged(e));

    const disposableCommand = vscode.commands.registerCommand('flow-state.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Flow-State!');
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

	const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
		checkZombiePackages(outputChannel);
	});

    const teleportCommand = vscode.commands.registerCommand('flow-state.teleport', async (args: { path: string, line: number }) => {
        // Find the file and open it
        const uri = vscode.Uri.file(args.path);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Jump directly to the bad line of code
        const position = new vscode.Position(args.line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    });

    context.subscriptions.push(
        disposableCommand,
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
        teleportCommand,
        editorChangeDisposable,
        documentChangeDisposable
    );
}

export function deactivate() {}
