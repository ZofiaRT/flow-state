import * as vscode from 'vscode';
import { TodoView } from './features/TodoView';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { PomodoroTimer } from './features/PomodoroTimer';
import { StatusBar } from './StatusBar';
import { ActivityTracker } from './features/ActivityTracker';
import { ReviewerTracker } from './features/ReviewerTracker';
import { ContextSwitchManager } from "./features/contextSwitch";
import { InactiveTabsManager } from './features/inactiveTabs';
import { registerFlowStateCommands } from './commands';

/**
 * Handles onboarding process for new users.
 */
function handleOnboarding(context: vscode.ExtensionContext) {
    const hasSeenOnboarding = context.globalState.get('flowState.hasSeenOnboarding');
    if (!hasSeenOnboarding) {
        const extensionId = context.extension.id;
        const walkthroughId = `${extensionId}#flowState.welcome`;

        vscode.commands.executeCommand('workbench.action.openWalkthrough', walkthroughId, false);
        context.globalState.update('flowState.hasSeenOnboarding', true);
    }
}

/**
 * Sets up the To-Do list feature.
 */
function setupTodoView(context: vscode.ExtensionContext) {
    const todoView = new TodoView();

    let addTaskCommand = vscode.commands.registerCommand('todo-list.addTask', async () => {
        const taskName = await vscode.window.showInputBox({ prompt: 'Enter task name' });
        if (taskName) {
            todoView.addTask(taskName); 
        }
    });

    let removeTaskCommand = vscode.commands.registerCommand('todo-list.removeTask', async (taskName: string) => {
        if (taskName) {
            todoView.removeTask(taskName);
        }
    });

    const treeView = vscode.window.createTreeView('todoListView', {
        treeDataProvider: todoView,
        showCollapseAll: false,
        canSelectMany: false
    });

    treeView.onDidChangeCheckboxState(e => {
        for (const [item, state] of e.items) {
            if (state === vscode.TreeItemCheckboxState.Checked) {
                todoView.removeTask(item.label);
            }
        }
    });

    context.subscriptions.push(addTaskCommand, removeTaskCommand, treeView);
}

/**
 * Sets up Git integration to analyze PRs.
 */
function setupGitIntegration(reviewerTracker: ReviewerTracker) {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        gitExtension.activate().then(() => {
            const gitApi = gitExtension.exports.getAPI(1);
            const attachRepoListener = (repo: any) => {
                repo.state.onDidChange(() => reviewerTracker.analyzePR());
            };
            gitApi.repositories.forEach(attachRepoListener);
            gitApi.onDidOpenRepository(attachRepoListener);
        });
    }

    reviewerTracker.analyzePR();
}

/**
 * Sets up event listeners.
 */
function setupEventListeners(
    context: vscode.ExtensionContext, 
    activityTracker: ActivityTracker, 
    cognitiveTracker: CognitiveLoadTracker
) {
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(e => cognitiveTracker.onEditorChanged(e)),
        vscode.workspace.onDidChangeTextDocument(e => {
            activityTracker.onDocumentChanged(e);
            cognitiveTracker.onDocumentChanged(e);
        }),
        vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            activityTracker.onScrolled(e);
            cognitiveTracker.evaluateCognitiveLoad();
        })
    );
}

/**
 * Activates the extension, initializing all features and registering commands and event listeners.
 */
export function activate(context: vscode.ExtensionContext) {    
    handleOnboarding(context);
    setupTodoView(context);

    // Initialize core features
    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);
    const pomodoroTimer = new PomodoroTimer(developerCognitiveLoadTracker);
    const contextSwitchManager = new ContextSwitchManager(flowStateStatusBar);
    const inactiveTabsManager = new InactiveTabsManager(flowStateStatusBar);
    const reviewerTracker = new ReviewerTracker(flowStateStatusBar);
    const outputChannel = vscode.window.createOutputChannel('Flow-State');


    setupGitIntegration(reviewerTracker);
    setupEventListeners(context, activityTracker, developerCognitiveLoadTracker);

    registerFlowStateCommands(context, {
        pomodoro: pomodoroTimer,
        reviewerTracker: reviewerTracker,
        inactiveTabs: inactiveTabsManager,
        cognitiveTracker: developerCognitiveLoadTracker,
        activityTracker: activityTracker,
        statusBar: flowStateStatusBar,
        contextSwitch: contextSwitchManager,
        outputChannel: outputChannel
    });


    context.subscriptions.push(
        flowStateStatusBar,
        pomodoroTimer,
        contextSwitchManager,
        outputChannel,
        inactiveTabsManager,
    );
}

export function deactivate() {}
