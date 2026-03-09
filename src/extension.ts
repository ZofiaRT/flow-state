import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './developerCognitiveLoad';

export function activate(context: vscode.ExtensionContext) {
    console.log('Flow-State extension is now active!');

    const loadTracker = new CognitiveLoadTracker();
    
    context.subscriptions.push(
        loadTracker.statusBarItem,
        vscode.workspace.onDidChangeTextDocument(e => loadTracker.onDocumentChanged(e)),
        vscode.window.onDidChangeActiveTextEditor(e => loadTracker.onEditorChanged(e)),
        vscode.window.onDidChangeTextEditorVisibleRanges(e => loadTracker.onScrolled(e))
    );

    // --- NEW: The Teleport Command triggered by clicking the popup links ---
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

    context.subscriptions.push(teleportCommand);
}

export function deactivate() {}