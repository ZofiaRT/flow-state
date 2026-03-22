import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { PomodoroTimer } from './features/PomodoroTimer';
import { StatusBar } from './StatusBar';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { ReviewerTracker } from './features/ReviewerTracker';
import { ContextSwitchManager } from "./contextSwitch";
import { Dashboard } from './Dashboard';
import { InactiveTabsManager } from './inactiveTabs';

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

    // Initialize core features
    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);
    const pomodoroTimer = new PomodoroTimer(developerCognitiveLoadTracker);
    const contextSwitchManager = new ContextSwitchManager();

    const inactiveTabsManager = new InactiveTabsManager();


    // Initialize the Reviewer Tracker
    const reviewerTracker = new ReviewerTracker(flowStateStatusBar);

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

    const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
        checkZombiePackages(outputChannel);
    });

    const dashboardDisposable = vscode.commands.registerCommand('flow-state.openDashboard', () => {
        Dashboard.show(context.extensionUri, developerCognitiveLoadTracker, activityTracker, flowStateStatusBar);
    });

    // Register the Manual PR Check Command
    const analyzePrDisposable = vscode.commands.registerCommand('flow-state.analyzePR', () => {
        reviewerTracker.analyzePR();
        vscode.window.showInformationMessage("Flow-State: Reviewer Cognitive Load Analyzed!");
    });

    // Listen for Git Staging changes automatically
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        gitExtension.activate().then(() => {
            const gitApi = gitExtension.exports.getAPI(1);

            // Helper function to attach listener to a repository
            const attachRepoListener = (repo: any) => {
                repo.state.onDidChange(() => reviewerTracker.analyzePR());
            };

            // Attach to any repos already found
            gitApi.repositories.forEach(attachRepoListener);

            // Attach to any repos Git finds in the future (solves the startup bug!)
            gitApi.onDidOpenRepository(attachRepoListener);
        });
    }

    // Run it once on startup just in case files are already staged
    reviewerTracker.analyzePR();

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

    // Add all disposables to subscriptions	const inactiveTabsManager = new InactiveTabsManager();

    context.subscriptions.push(
        flowStateStatusBar,
        pomodoroTimer,
        contextSwitchManager,
        outputChannel,
        dashboardDisposable,
        contextSwitchManager,
        inactiveTabsManager,
        analyzePrDisposable,
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

export function deactivate() { }
