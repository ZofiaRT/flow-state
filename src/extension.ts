import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { StatusBar } from './StatusBar';
import { ContextSwitchManager } from "./contextSwitch";

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);

    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(e => developerCognitiveLoadTracker.onEditorChanged(e));
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => { 
        activityTracker.onDocumentChanged(e);
        developerCognitiveLoadTracker.onDocumentChanged(e);
    });
    const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
        activityTracker.onScrolled(e);
        developerCognitiveLoadTracker.evaluateCognitiveLoad();
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

	const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
		checkZombiePackages(outputChannel);
	});

    const contextSwitchManager = new ContextSwitchManager();

    context.subscriptions.push(
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
        editorChangeDisposable,
        documentChangeDisposable,
        scrollDisposable,
		contextSwitchManager
    );
}

export function deactivate() {}
