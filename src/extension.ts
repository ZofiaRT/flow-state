import * as vscode from 'vscode';
import { StatusBar } from './StatusBar';
import { checkZombiePackages } from './zombiePackages';
import { ContextSwitchManager } from "./contextSwitch";

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();

    const disposableCommand = vscode.commands.registerCommand('flow-state.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Flow-State!');
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

	const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
		checkZombiePackages(outputChannel);
	});

    const contextSwitchManager = new ContextSwitchManager();

    context.subscriptions.push(
        disposableCommand,
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
		contextSwitchManager
    );
}

export function deactivate() {}

