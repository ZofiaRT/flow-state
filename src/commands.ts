import * as vscode from 'vscode';
import { PomodoroTimer } from './features/PomodoroTimer';
import { ReviewerTracker } from './features/ReviewerTracker';
import { InactiveTabsManager } from './features/inactiveTabs';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { ActivityTracker } from './features/ActivityTracker';
import { StatusBar } from './StatusBar';
import { ContextSwitchManager } from './features/contextSwitch';
import { Dashboard } from './Dashboard';
import { checkZombiePackages } from './zombiePackages';

export function registerFlowStateCommands(
    context: vscode.ExtensionContext, 
    deps: { 
        pomodoro: PomodoroTimer, 
        reviewerTracker: ReviewerTracker,
        inactiveTabs: InactiveTabsManager,
        cognitiveTracker: CognitiveLoadTracker,
        activityTracker: ActivityTracker,
        statusBar: StatusBar,
        contextSwitch: ContextSwitchManager,
        outputChannel: vscode.OutputChannel
    }
) {
    context.subscriptions.push(
        vscode.commands.registerCommand('flow-state.startPomodoro', () => deps.pomodoro.start()),
        vscode.commands.registerCommand('flow-state.pausePomodoro', () => deps.pomodoro.pause()),
        vscode.commands.registerCommand('flow-state.resumePomodoro', () => deps.pomodoro.resume()),
        vscode.commands.registerCommand('flow-state.stopPomodoro', () => deps.pomodoro.stop()),
        vscode.commands.registerCommand('flow-state.reviewInactiveTabs', () => deps.inactiveTabs.showInactiveTabsPicker()),
        vscode.commands.registerCommand('flow-state.analyzePR', () => {
            deps.reviewerTracker.analyzePR();
            vscode.window.showInformationMessage("Flow-State: Reviewer Cognitive Load Analyzed!");
        }),
        vscode.commands.registerCommand('flow-state.checkZombiePackages', () => checkZombiePackages(deps.outputChannel)),
        vscode.commands.registerCommand('flow-state.openDashboard', () => {
            Dashboard.show(context.extensionUri, deps.cognitiveTracker, deps.activityTracker, deps.statusBar, deps.contextSwitch);
        })
    );
}