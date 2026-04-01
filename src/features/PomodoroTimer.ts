import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './DeveloperCognitiveLoadTracker';

export class PomodoroTimer implements vscode.Disposable {
    /**
     * A Pomodoro timer that integrates with the CognitiveLoadTracker to adjust focus session durations based on developer cognitive load.
     * It provides start, pause, resume, and stop functionality, and displays status updates in the VS Code status bar.
    */

    private focusDuration!: number;
    private currentFocusDuration: number = this.focusDuration;
    private shortBreakDuration!: number;
    private longBreakDuration!: number;
    private maxCycles!: number;
    private isSmartPomodoroEnabled!: boolean;
    
    private timer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private isFocusSession: boolean = true;
    private cycle: number = 1;
    private timeRemaining: number = 0;
    
    private cognitiveLoadTracker: CognitiveLoadTracker;
    
    // UI Status bars
    private startBar: vscode.StatusBarItem;
    private pauseBar: vscode.StatusBarItem;
    private stopBar: vscode.StatusBarItem;
    
    // Cognitive load thresholds
    private LOW_COMPLEXITY_THRESHOLD = 15;
    private HIGH_COMPLEXITY_THRESHOLD = 25;
    
    // Adjustment multipliers
    private GOOD_FOCUS_MULTIPLIER = 1.2;
    private HIGH_LOAD_MULTIPLIER = 0.8;
    private MAX_MULTIPLIER = 1.5;
    private MIN_MULTIPLIER = 0.5;
    
    // Timing constants
    private INITIAL_COMPLEXITY_CHECK_DELAY = 60;
    private PERIODIC_CHECK_INTERVAL = 5 * 60;

    private disposables: vscode.Disposable[] = [];

    private shortBreakSuggestions: string[] = [
        "☕ Get a coffee",
        "🚶 Go for a short walk",
        "💧 Drink some water",
        "🧘 Stretch your body",
        "👀 Rest your eyes (look away from the screen)"
    ];

    private longBreakSuggestions: string[] = [
        "🌳 Go for a longer walk outside",
        "🍽 Grab a proper meal",
        "💬 Talk to a colleague",
        "📵 Disconnect from screens for a bit",
        "🛋 Relax and recharge"
    ];
    
    /**
     * Get a random suggestion for a break activity based on whether it's a long or short break.
     * @param isLongBreak 
     * @returns random suggestion string
     */
    private getRandomSuggestion(isLongBreak: boolean): string {
        const suggestions = isLongBreak 
            ? this.longBreakSuggestions 
            : this.shortBreakSuggestions;

        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    /**
     * Initializes the Pomodoro timer with the provided cognitive load tracker.
     * @param cognitiveLoadTracker 
     */
    constructor(cognitiveLoadTracker: CognitiveLoadTracker) {
        this.cognitiveLoadTracker = cognitiveLoadTracker;
        
        // Load configuration from VS Code settings
        this.loadConfiguration();
        
        // Initialize status bars
        this.startBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.startBar.text = "🍅 Start Pomodoro";
        this.startBar.command = "flow-state.startPomodoro";
        this.startBar.show();
        
        this.pauseBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.pauseBar.text = "⏸ Pause";
        this.pauseBar.command = "flow-state.pausePomodoro";
        this.pauseBar.hide();
        
        this.stopBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.stopBar.text = "⏹ Stop";
        this.stopBar.command = "flow-state.stopPomodoro";
        this.stopBar.hide();

        // Listen for configuration changes
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('flow-state')) {
                    this.loadConfiguration();
                }
            })
        );
    }

    /**
     * Load pomodoro configuration from VS Code settings
     */
    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('flow-state');
        
        this.focusDuration = (config.get<number>('pomodoroFocusTimeMinutes', 25)) * 60;
        this.shortBreakDuration = (config.get<number>('pomodoroBreakTimeMinutes', 5)) * 60;
        this.longBreakDuration = (config.get<number>('pomodoroLongBreakTimeMinutes', 15)) * 60;
        this.maxCycles = config.get<number>('cycleCount', 4);
        this.isSmartPomodoroEnabled = config.get<boolean>('enableSmartPomodoro', true);
        
        this.currentFocusDuration = this.focusDuration;
    }

    /**
     * Calculates the adjusted focus duration based on the current cognitive load complexity score. 
     * If the score is low, it may provide a bonus to focus time, and if it's high,
     * it may reduce the focus time to encourage breaks.
     * @returns object containing the adjusted duration, the adjustment amount, the multiplier applied, and the current complexity score
     */
    private calculateAdjustedFocusDuration(): { adjustedDuration: number; adjustment: number; multiplier: number; complexityScore: number } {
        const complexityScore = this.cognitiveLoadTracker.currentComplexityScore;
        let multiplier = 1.0;
        
        if (complexityScore < this.LOW_COMPLEXITY_THRESHOLD) {
            multiplier = this.GOOD_FOCUS_MULTIPLIER;
        } else if (complexityScore > this.HIGH_COMPLEXITY_THRESHOLD) {
            multiplier = this.HIGH_LOAD_MULTIPLIER;
        }
        
        multiplier = Math.max(this.MIN_MULTIPLIER, Math.min(multiplier, this.MAX_MULTIPLIER));
        
        const adjustedDuration = Math.floor(this.focusDuration * multiplier);
        const adjustment = adjustedDuration - this.focusDuration;
        
        return { adjustedDuration, adjustment, multiplier, complexityScore };
    }

    /**
     * Starts the Pomodoro timer.
     */
    public async start(): Promise<void> {
        if (this.isRunning) {
            vscode.window.showWarningMessage("Pomodoro session already running!");
            return;
        }

        this.cycle = 1;
        this.isFocusSession = true;
        this.isRunning = true;

        this.currentFocusDuration = this.focusDuration;
        this.timeRemaining = this.currentFocusDuration;

        vscode.window.showInformationMessage(`🍅 Pomodoro started: ${this.focusDuration / 60}min focus`);

        this.pauseBar.show();
        this.stopBar.show();

        this.startTimer();
    }

    /**
     * Pauses the Pomodoro timer.
     */
    public pause(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            vscode.window.showInformationMessage("⏸ Pomodoro paused");
            this.pauseBar.text = "▶ Resume";
            this.pauseBar.command = "flow-state.resumePomodoro";
        }
    }

    /**
     * Resumes the Pomodoro timer if it is currently paused.
     */
    public resume(): void {
        if (!this.timer && this.isRunning) {
            vscode.window.showInformationMessage("▶ Pomodoro resumed");
            this.pauseBar.text = "⏸ Pause";
            this.pauseBar.command = "flow-state.pausePomodoro";
            this.startTimer();
        }
    }

    /**
     * Stops the Pomodoro timer and resets it.
     */
    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        this.startBar.text = "🍅 Start Pomodoro";
        this.pauseBar.hide();
        this.stopBar.hide();
        vscode.window.showInformationMessage("⏹ Pomodoro stopped");
    }

    /**
     * Starts the internal timer that counts down the focus or break session.
     */
    private startTimer(): void {
        let elapsedSeconds = 0;
        let lastComplexityCheckTime = 0;
        let lastRecordedMultiplier = 1.0;

        this.timer = setInterval(() => {
            this.timeRemaining--;
            elapsedSeconds++;

            if (this.isSmartPomodoroEnabled && this.isFocusSession && elapsedSeconds - lastComplexityCheckTime >= this.PERIODIC_CHECK_INTERVAL) {
                if (elapsedSeconds >= this.INITIAL_COMPLEXITY_CHECK_DELAY) {
                    const { adjustedDuration, adjustment, multiplier, complexityScore } = this.calculateAdjustedFocusDuration();
                    
                    console.log(`[pomodoro] Check #${Math.floor(elapsedSeconds / this.PERIODIC_CHECK_INTERVAL)} | Complexity: ${complexityScore} | Multiplier: ${multiplier.toFixed(2)}`);
                    
                    if (Math.abs(multiplier - lastRecordedMultiplier) > 0.05) {
                        if (adjustment > 0) {
                            const bonusMinutes = (adjustment / 60).toFixed(1);
                            vscode.window.showInformationMessage(`✨ Good focus! +${bonusMinutes}min bonus`);
                            this.timeRemaining += adjustment;
                        } else if (adjustment < 0) {
                            const reductionMinutes = (-adjustment / 60).toFixed(1);
                            vscode.window.showInformationMessage(`⚠️ High complexity. ${reductionMinutes}min adjusted for wellbeing`);
                            this.timeRemaining += adjustment;
                        }
                        
                        lastRecordedMultiplier = multiplier;
                        this.currentFocusDuration = adjustedDuration;
                    }
                    
                    lastComplexityCheckTime = elapsedSeconds;
                }
            }

            const minutes = Math.floor(this.timeRemaining / 60);
            const seconds = this.timeRemaining % 60;
            this.startBar.text = `${this.isFocusSession ? "🍅 Focus" : "☕ Break"} ${minutes}:${seconds.toString().padStart(2, "0")}`;

            if (this.timeRemaining <= 0) {
                clearInterval(this.timer!);
                this.timer = null;

                if (this.isFocusSession) {
                    vscode.window.showInformationMessage(`✅ Focus session ${this.cycle} complete!`);
                    const isLongBreak = this.cycle === this.maxCycles;
                    this.startBreak(isLongBreak);
                } else {
                    if (this.cycle === this.maxCycles) {
                        vscode.window.showInformationMessage("🎉 Pomodoro set finished!");
                        this.stop();
                    } else {
                        this.cycle++;
                        this.startFocus();
                    }
                }
            }
        }, 1000);
    }

    /**
     * Starts Focus Session
     */
    private startFocus(): void {
        this.isFocusSession = true;
        this.currentFocusDuration = this.focusDuration;
        this.timeRemaining = this.currentFocusDuration;
        
        vscode.window.showInformationMessage(`🍅 Focus session ${this.cycle} started`);
        this.startTimer();
    }

    /**
     * Starts break session.
     * @param longBreak boolean indicating whether to start a long break (true) or short break (false)
     */
    private startBreak(longBreak: boolean): void {
        this.isFocusSession = false;
        this.timeRemaining = longBreak ? this.longBreakDuration : this.shortBreakDuration;

        const suggestion = this.getRandomSuggestion(longBreak);

        vscode.window.showInformationMessage(
            longBreak 
                ? `🌴 Long break (${this.longBreakDuration / 60} min)\n${suggestion}`
                : `☕ Short break (${this.shortBreakDuration / 60} min)\n${suggestion}`
        );

        this.startTimer();
    }

    dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.startBar.dispose();
        this.pauseBar.dispose();
        this.stopBar.dispose();
        
        this.disposables.forEach(d => d.dispose());
    }
}