import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { StatusBar } from './StatusBar';
import { ContextSwitchManager } from "./contextSwitch";
import { Dashboard } from './Dashboard';

function handleOnboarding(context: vscode.ExtensionContext) {
    const hasSeenOnboarding = context.globalState.get('flowState.hasSeenOnboarding');

    if (!hasSeenOnboarding) {
        const extensionId = context.extension.id;
        const walkthroughId = `${extensionId}#flowState.welcome`;

        vscode.commands.executeCommand('workbench.action.openWalkthrough', walkthroughId, false);
        context.globalState.update('flowState.hasSeenOnboarding', true);
    }
}

export function activate(context: vscode.ExtensionContext) {
    handleOnboarding(context);

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

    const dashboardDisposable = vscode.commands.registerCommand('flow-state.openDashboard', () => {
        Dashboard.show(context.extensionUri, activityTracker);
    });

    const contextSwitchManager = new ContextSwitchManager();

    context.subscriptions.push(
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
        dashboardDisposable,
        editorChangeDisposable,
        documentChangeDisposable,
        scrollDisposable,
        contextSwitchManager
    );
}

export function deactivate() { }
