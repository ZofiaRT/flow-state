import * as vscode from 'vscode';
import { StatusBar } from './StatusBar'
import { checkZombiePackages } from './zombiePackages';

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

    const disposableCommand = vscode.commands.registerCommand('flow-state.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Flow-State!');
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

	const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
		checkZombiePackages(outputChannel);
	});

    context.subscriptions.push(
        disposableCommand,
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
    );
}

export function deactivate() {}

