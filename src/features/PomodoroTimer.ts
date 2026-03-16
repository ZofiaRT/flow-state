import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './DeveloperCognitiveLoadTracker';

export class PomodoroTimer implements vscode.Disposable {
    private focusDuration: number = 25 * 60; // User-set focus time (in seconds)
    private currentFocusDuration: number; // After cognitive load adjustment
    private shortBreakDuration: number = 5 * 60; // 5 minutes
    private longBreakDuration: number = 15 * 60; // 15 minutes
    private maxCycles: number = 4;
    
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
    private LOW_COMPLEXITY_THRESHOLD = 15; // Good focus if complexity < 15
    private HIGH_COMPLEXITY_THRESHOLD = 25;
    
    // Adjustment multipliers (relative/proportional)
    private GOOD_FOCUS_MULTIPLIER = 1.2; // 20% bonus for good focus
    private HIGH_LOAD_MULTIPLIER = 0.8; // 20% reduction for high complexity
    private MAX_MULTIPLIER = 1.5; // Cap: never more than 30% longer
    private MIN_MULTIPLIER = 0.5; // Cap: never more than 30% shorter
    
    // Timing constants
    private INITIAL_COMPLEXITY_CHECK_DELAY = 60; // First check
    private PERIODIC_CHECK_INTERVAL = 5*60; // Check every 5 minutes after initial
    
    constructor(cognitiveLoadTracker: CognitiveLoadTracker) {
        this.cognitiveLoadTracker = cognitiveLoadTracker;
        this.currentFocusDuration = this.focusDuration;
        
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
    }

    /**
     * Dynamically adjusts focus time based on cognitive load (RELATIVE/MULTIPLIER-BASED)
     * - Good focus (low complexity): 1.2x multiplier (20% bonus)
     * - Normal focus: 1.0x multiplier (no change)
     * - High complexity: 0.8x multiplier (20% reduction)
     * 
     * Capped between 0.7x and 1.3x to prevent extreme adjustments
     * 
     * Returns: { adjustedDuration, adjustment, multiplier, complexityScore }
     */
    private calculateAdjustedFocusDuration(): { adjustedDuration: number; adjustment: number; multiplier: number; complexityScore: number } {
        const complexityScore = this.cognitiveLoadTracker.currentComplexityScore;
        let multiplier = 1.0;
        
        if (complexityScore < this.LOW_COMPLEXITY_THRESHOLD) {
            multiplier = this.GOOD_FOCUS_MULTIPLIER;
        } else if (complexityScore > this.HIGH_COMPLEXITY_THRESHOLD) {
            multiplier = this.HIGH_LOAD_MULTIPLIER;
        }
        
        // Cap the multiplier to prevent extreme adjustments
        multiplier = Math.max(this.MIN_MULTIPLIER, Math.min(multiplier, this.MAX_MULTIPLIER));
        
        const adjustedDuration = Math.floor(this.focusDuration * multiplier);
        const adjustment = adjustedDuration - this.focusDuration;
        
        return { adjustedDuration, adjustment, multiplier, complexityScore };
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            vscode.window.showWarningMessage("Pomodoro session already running!");
            return;
        }

        // Ask user for custom times
        const focusInput = await vscode.window.showInputBox({
            prompt: "Enter focus time in minutes",
            value: "25",
            validateInput: this.validateNumber
        });

        const shortBreakInput = await vscode.window.showInputBox({
            prompt: "Enter short break time in minutes",
            value: "5",
            validateInput: this.validateNumber
        });

        const longBreakInput = await vscode.window.showInputBox({
            prompt: "Enter long break time in minutes",
            value: "15",
            validateInput: this.validateNumber
        });

        const cycleInput = await vscode.window.showInputBox({
            prompt: "Enter number of cycles",
            value: "4",
            validateInput: this.validateNumber
        });

        if (!focusInput || !shortBreakInput || !longBreakInput || !cycleInput) {
            vscode.window.showErrorMessage("Pomodoro setup cancelled.");
            return;
        }

        // Store user input as the BASE durations
        this.focusDuration = parseInt(focusInput) * 60;
        this.shortBreakDuration = parseInt(shortBreakInput) * 60;
        this.longBreakDuration = parseInt(longBreakInput) * 60;
        this.maxCycles = parseInt(cycleInput);

        // Reset state
        this.cycle = 1;
        this.isFocusSession = true;
        this.isRunning = true;

        // DON'T apply cognitive load adjustment on first start
        // User hasn't written any code yet!
        this.currentFocusDuration = this.focusDuration;
        this.timeRemaining = this.currentFocusDuration;

        vscode.window.showInformationMessage(`🍅 Pomodoro started: ${focusInput}min focus`);

        // Show pause/stop buttons
        this.pauseBar.show();
        this.stopBar.show();

        this.startTimer();
    }

    public pause(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            vscode.window.showInformationMessage("⏸ Pomodoro paused");
            this.pauseBar.text = "▶ Resume";
            this.pauseBar.command = "flow-state.resumePomodoro";
        }
    }

    public resume(): void {
        if (!this.timer && this.isRunning) {
            vscode.window.showInformationMessage("▶ Pomodoro resumed");
            this.pauseBar.text = "⏸ Pause";
            this.pauseBar.command = "flow-state.pausePomodoro";
            this.startTimer();
        }
    }

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

    private startTimer(): void {
        let elapsedSeconds = 0;
        let lastComplexityCheckTime = 0;
        let lastRecordedMultiplier = 1.0;

        this.timer = setInterval(() => {
            this.timeRemaining--;
            elapsedSeconds++;

            // Perform cyclic complexity checks during focus sessions
            if (this.isFocusSession && elapsedSeconds - lastComplexityCheckTime >= this.PERIODIC_CHECK_INTERVAL) {
                // Skip the first check until INITIAL_COMPLEXITY_CHECK_DELAY
                if (elapsedSeconds >= this.INITIAL_COMPLEXITY_CHECK_DELAY) {
                    const { adjustedDuration, adjustment, multiplier, complexityScore } = this.calculateAdjustedFocusDuration();
                    
                    console.log(`[pomodoro] Check #${Math.floor(elapsedSeconds / this.PERIODIC_CHECK_INTERVAL)} | Complexity: ${complexityScore} | Multiplier: ${multiplier.toFixed(2)}`);
                    
                    // If multiplier changed significantly, notify user and adjust time
                    if (Math.abs(multiplier - lastRecordedMultiplier) > 0.05) {
                        if (adjustment > 0) {
                            const bonusMinutes = (adjustment / 60).toFixed(1);
                            vscode.window.showInformationMessage(`✨ Good focus! +${bonusMinutes}min bonus`);
                            this.timeRemaining += adjustment;
                        } else if (adjustment < 0) {
                            const reductionMinutes = (-adjustment / 60).toFixed(1);
                            vscode.window.showInformationMessage(`⚠️ High complexity. ${reductionMinutes}min adjusted for wellbeing`);
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

    private startFocus(): void {
        this.isFocusSession = true;
        
        // Just set the base duration - adjustments will happen cyclically
        this.currentFocusDuration = this.focusDuration;
        this.timeRemaining = this.currentFocusDuration;
        
        vscode.window.showInformationMessage(`🍅 Focus session ${this.cycle} started`);
        this.startTimer();
    }

    private startBreak(longBreak: boolean): void {
        this.isFocusSession = false;
        this.timeRemaining = longBreak ? this.longBreakDuration : this.shortBreakDuration;
        vscode.window.showInformationMessage(
            longBreak 
                ? `🌴 Long break (${this.longBreakDuration / 60} min)` 
                : `☕ Short break (${this.shortBreakDuration / 60} min)`
        );
        this.startTimer();
    }

    private validateNumber(value: string): string | null {
        const n = Number(value);
        if (isNaN(n) || n <= 0) {
            return "Please enter a positive number";
        }
        return null;
    }

    dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.startBar.dispose();
        this.pauseBar.dispose();
        this.stopBar.dispose();
    }
}