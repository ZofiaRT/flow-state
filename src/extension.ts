import * as vscode from 'vscode';
import { StatusBar } from './StatusBar'

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();

    const disposableCommand = vscode.commands.registerCommand('flow-state.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from Flow-State!');
    });

    context.subscriptions.push(
        disposableCommand,
        flowStateStatusBar 
    );
}

export function deactivate() {}