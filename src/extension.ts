import * as vscode from 'vscode';
import { StatusBar } from './StatusBar'
import { checkZombiePackages } from './zombiePackages';
import * as path from "path";
import { ContextSwitchTracker } from "./context_switch/contextSwitchManager";
import { WarningManager } from "./context_switch/warningManager";


export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();
	const warningManager = new WarningManager();

    const disposableCommand = vscode.commands.registerCommand('flow-state.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Flow-State!');
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

	const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
		checkZombiePackages(outputChannel);
	});

	const contextSwitch = new ContextSwitchTracker(() => warningManager.showWarning());

    context.subscriptions.push(
        disposableCommand,
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
		contextSwitch
    );
}

export function deactivate() {}

