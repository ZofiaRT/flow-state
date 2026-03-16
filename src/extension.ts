import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { PomodoroTimer } from './features/PomodoroTimer';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { StatusBar } from './StatusBar';
import { ContextSwitchManager } from "./contextSwitch";

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    // Initialize core features
    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);
    const pomodoroTimer = new PomodoroTimer(developerCognitiveLoadTracker);
    const contextSwitchManager = new ContextSwitchManager();

    // Register event listeners
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(e => 
        developerCognitiveLoadTracker.onEditorChanged(e)
    );
    
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => { 
        activityTracker.onDocumentChanged(e);
        developerCognitiveLoadTracker.onDocumentChanged(e);
    });
    
    const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
        activityTracker.onScrolled(e);
        developerCognitiveLoadTracker.evaluateCognitiveLoad();
    });

    // Create output channel
    const outputChannel = vscode.window.createOutputChannel('Flow-State');

    // Register commands
    const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
        checkZombiePackages(outputChannel);
    });

    const startPomodoroDisposable = vscode.commands.registerCommand('flow-state.startPomodoro', () => {
        pomodoroTimer.start();
    });

    const pausePomodoroDisposable = vscode.commands.registerCommand('flow-state.pausePomodoro', () => {
        pomodoroTimer.pause();
    });

    const resumePomodoroDisposable = vscode.commands.registerCommand('flow-state.resumePomodoro', () => {
        pomodoroTimer.resume();
    });

    const stopPomodoroDisposable = vscode.commands.registerCommand('flow-state.stopPomodoro', () => {
        pomodoroTimer.stop();
    });

    // Add all disposables to subscriptions
    context.subscriptions.push(
        flowStateStatusBar,
        pomodoroTimer,
        contextSwitchManager,
        outputChannel,
        editorChangeDisposable,
        documentChangeDisposable,
        scrollDisposable,
        zombieDisposable,
        startPomodoroDisposable,
        pausePomodoroDisposable,
        resumePomodoroDisposable,
        stopPomodoroDisposable
    );
}

export function deactivate() {}