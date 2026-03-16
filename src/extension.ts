import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { StatusBar } from './StatusBar';
import { ContextSwitchManager } from "./contextSwitch";

let timer: NodeJS.Timeout | undefined;
let timeRemaining = 0;
let cycle = 1;
let isBreak = false;

let FOCUS_TIME = 25 * 60;     // default 25 minutes
let SHORT_BREAK = 5 * 60;     // default 5 minutes
let LONG_BREAK = 15 * 60;     // default 15 minutes
let MAX_CYCLES = 4;

const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const pauseBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
const stopBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

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

		// START Button
	statusBar.text = "🍅 Start Pomodoro";
	statusBar.command = "flow-state.startPomodoro";
	statusBar.show();

	// PAUSE Button
	pauseBar.text = "⏸ Pause";
	pauseBar.command = "flow-state.pausePomodoro";
	pauseBar.hide();

	// STOP Button
	stopBar.text = "⏹ Stop";
	stopBar.command = "flow-state.stopPomodoro";
	stopBar.hide();

	context.subscriptions.push(statusBar, pauseBar, stopBar);

	// Start command
	const startPomodoro = vscode.commands.registerCommand('flow-state.startPomodoro', async () => {

		// Ask user for custom times
		const focusInput = await vscode.window.showInputBox({
			prompt: "Enter focus time in minutes",
			value: "25",
			validateInput: validateNumber
		});

		const shortBreakInput = await vscode.window.showInputBox({
			prompt: "Enter short break time in minutes",
			value: "5",
			validateInput: validateNumber
		});

		const longBreakInput = await vscode.window.showInputBox({
			prompt: "Enter long break time in minutes",
			value: "15",
			validateInput: validateNumber
		});

		const cycleInput = await vscode.window.showInputBox({
			prompt: "Enter number of cycles",
			value: "4",
			validateInput: validateNumber
		});

		if (!focusInput || !shortBreakInput || !longBreakInput || !cycleInput) {
			vscode.window.showErrorMessage("Pomodoro setup cancelled.");
			return;
		}

		FOCUS_TIME = parseInt(focusInput) * 60;
		SHORT_BREAK = parseInt(shortBreakInput) * 60;
		LONG_BREAK = parseInt(longBreakInput) * 60;
		MAX_CYCLES = parseInt(cycleInput);

		// Reset state
		if (timer) {clearInterval(timer);}
		cycle = 1;
		isBreak = false;
		timeRemaining = FOCUS_TIME;

		vscode.window.showInformationMessage(`🍅 Pomodoro started: ${focusInput}min focus`);

		// Show pause/stop buttons
		pauseBar.show();
		stopBar.show();

		startTimer();
	});

	// Pause command
	const pausePomodoro = vscode.commands.registerCommand('flow-state.pausePomodoro', () => {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
			vscode.window.showInformationMessage("⏸ Pomodoro paused");
			pauseBar.text = "▶ Resume";
			pauseBar.command = "flow-state.resumePomodoro";
		}
	});

	// Resume command
	const resumePomodoro = vscode.commands.registerCommand('flow-state.resumePomodoro', () => {
		if (!timer) {
			vscode.window.showInformationMessage("▶ Pomodoro resumed");
			pauseBar.text = "⏸ Pause";
			pauseBar.command = "flow-state.pausePomodoro";
			startTimer();
		}
	});

	// Stop command
	const stopPomodoro = vscode.commands.registerCommand('flow-state.stopPomodoro', () => {
		if (timer) {clearInterval(timer);}
		timer = undefined;
		statusBar.text = "🍅 Start Pomodoro";
		pauseBar.hide();
		stopBar.hide();
		vscode.window.showInformationMessage("⏹ Pomodoro stopped");
	});

	context.subscriptions.push(startPomodoro, pausePomodoro, resumePomodoro, stopPomodoro);
}

// Validate input is a positive number
function validateNumber(value: string) {
	const n = Number(value);
	if (isNaN(n) || n <= 0) {return "Please enter a positive number";}
	return null;
}

function startTimer() {
	timer = setInterval(() => {
		timeRemaining--;
		const minutes = Math.floor(timeRemaining / 60);
		const seconds = timeRemaining % 60;
		statusBar.text = `${isBreak ? "☕ Break" : "🍅 Focus"} ${minutes}:${seconds.toString().padStart(2, "0")}`;

		if (timeRemaining <= 0) {
			clearInterval(timer!);
			timer = undefined;

			if (!isBreak) {
				vscode.window.showInformationMessage(`✅ Focus session ${cycle} complete!`);
				if (cycle === MAX_CYCLES) {
					startBreak(true);
				} else {
					startBreak(false);
				}
			} else {
				if (cycle === MAX_CYCLES) {
					vscode.window.showInformationMessage("🎉 Pomodoro set finished!");
					statusBar.text = "🍅 Start Pomodoro";
					pauseBar.hide();
					stopBar.hide();
				} else {
					cycle++;
					startFocus();
				}
			}
		}
	}, 1000);
}

function startFocus() {
	isBreak = false;
	timeRemaining = FOCUS_TIME;
	vscode.window.showInformationMessage(`🍅 Focus session ${cycle} started`);
	startTimer();
}

function startBreak(longBreak: boolean) {
	isBreak = true;
	timeRemaining = longBreak ? LONG_BREAK : SHORT_BREAK;
	vscode.window.showInformationMessage(
		longBreak ? `🌴 Long break (${LONG_BREAK / 60} min)` : `☕ Short break (${SHORT_BREAK / 60} min)`
	);
	startTimer();
}

export function deactivate() {
	if (timer) {clearInterval(timer);}
}

