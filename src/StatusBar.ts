import * as vscode from 'vscode';

export class StatusBar {
    public statusBarItem: vscode.StatusBarItem;
    private complexityScore: number = 0;

    private isMasterEnabled: boolean = true;
    private isComplexityEnabled: boolean = true;

    private isReviewerEnabled: boolean = true;
    private reviewerFileCount: number = 0;
    private reviewerLoc: number = 0;
    private reviewerComplexityFiles: number = 0;
    private zombieNames: string[] = [];
    private complexFilesList: { name: string, score: number }[] = [];

    private activeWarningType: 'DELETION' | 'READING' | 'INSERTION' | null = null;

    private activeStatusBarWarning: string | null = null;
    private activeTooltipWarning: string | null = null;
    
    private statusBarTimeout: NodeJS.Timeout | null = null;
    private tooltipTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(pulse) Flow State: Optimal";
        
        this.updateHoverPopup();
        this.statusBarItem.show();
    }

    public dispose() {
        if (this.statusBarTimeout) { clearTimeout(this.statusBarTimeout); }
        if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); }
        this.statusBarItem.dispose();
    }

    public updateConfigState(master: boolean, complexity: boolean) {
        this.isMasterEnabled = master;
        this.isComplexityEnabled = complexity;
        this.updateHoverPopup();
    }

    public updateReviewerStats(enabled: boolean, fileCount: number, loc: number, complexFiles: number, zombies: string[], 
    complexFilesList: { name: string, score: number }[]) {
        this.isReviewerEnabled = enabled;
        this.reviewerFileCount = fileCount;
        this.reviewerLoc = loc;
        this.reviewerComplexityFiles = complexFiles;
        this.zombieNames = zombies;
        this.complexFilesList = complexFilesList;

        // Check for Reviewer Warnings
        const locConfig = vscode.workspace.getConfiguration('flow-state').get<number>('reviewerLocThreshold', 400);
    const hasWarning = loc > (locConfig ?? 400) || complexFiles > 0 || zombies.length > 0;

        // If there is a warning, turn the status bar yellow!
        if (enabled && hasWarning) {
            this.statusBarItem.text = `$(warning) High PR Load`; // Made briefer for the bar
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else if (!this.activeStatusBarWarning) {
            // Revert to normal if everything is fine
            this.statusBarItem.text = "$(pulse) Flow State: Optimal";
            this.statusBarItem.backgroundColor = undefined;
        }
        
        this.updateHoverPopup();
    }

    public updateComplexity(score: number) {
        this.complexityScore = score;
        
        if (!this.activeStatusBarWarning) {
            this.statusBarItem.text = "$(pulse) Flow State: Optimal";
            this.statusBarItem.backgroundColor = undefined;
        }

        this.updateHoverPopup();
    }

    public flashStatusBar(message: string) {
        if (this.statusBarTimeout) { clearTimeout(this.statusBarTimeout); }

        this.activeStatusBarWarning = message;
        this.statusBarItem.text = `$(warning) ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.updateHoverPopup();

        this.statusBarTimeout = setTimeout(() => {
            this.activeStatusBarWarning = null;
            this.updateComplexity(this.complexityScore);
        }, 5000);
    }

    public showTemporaryWarning(message: string, type?: 'DELETION' | 'READING' | 'INSERTION') {
        this.flashStatusBar(message); 

        if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); }
        this.activeTooltipWarning = message;
        this.activeWarningType = type || null;
        this.updateHoverPopup();

        this.tooltipTimeout = setTimeout(() => {
            this.activeTooltipWarning = null;
            this.activeWarningType = null;
            this.updateHoverPopup();
        }, 60000);
    }

    public updateHoverPopup() {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        const config = vscode.workspace.getConfiguration('flow-state');
        const complexityThreshold = config.get<number>('complexityThreshold', 15);

        tooltip.appendMarkdown(`### Flow-State Session\n\n---\n\n`);

        if (!this.isMasterEnabled) {
            tooltip.appendMarkdown(`*Cognitive Load Tracking is currently disabled in settings.*`);
            this.statusBarItem.tooltip = tooltip;
            return;
        }

        // Main Cognitive Load Section
        tooltip.appendMarkdown(`### Cognitive Load\n\n`);

        const currentWarning = this.activeTooltipWarning; 
        const hasComplexityWarning = this.isComplexityEnabled && this.complexityScore > complexityThreshold;

        tooltip.appendMarkdown(`#### Active Alerts\n\n`);
        
        if (currentWarning || hasComplexityWarning) {
            if (currentWarning) {
                let suggestion = "";
                // Use the Message Type logic to provide non-brittle suggestions
                switch (this.activeWarningType) {
                    case 'DELETION':
                        suggestion = "\n\n> **Suggestion:** Significant deletions detected. Take a walk to reset your mind; the solution often appears when you step away.";
                        break;
                    case 'READING':
                        suggestion = "\n\n> **Suggestion:** Tracing complex code is mentally taxing. Consider a short break or drawing the logic on paper.";
                        break;
                    case 'INSERTION':
                        suggestion = "\n\n> **Suggestion:** Pasting large blocks of generated code introduces 'Comprehension Debt'. Take a moment to read and fully understand this logic before continuing.";
                        break;
                }
                tooltip.appendMarkdown(`* ${currentWarning}${suggestion}\n\n`);
            }
            if (hasComplexityWarning) {
                tooltip.appendMarkdown(`* **High Code Complexity (Score: ${this.complexityScore})**\n\n`);
            }
        } else {
            tooltip.appendMarkdown(`#### Active Alerts\n\n`);
            tooltip.appendMarkdown(`* $(check) Optimal\n\n`);
        }

        if (this.isComplexityEnabled) {
            tooltip.appendMarkdown(`#### Code Complexity\n\n`);
            tooltip.appendMarkdown(`* Current File Score: **${this.complexityScore}** *(Threshold: ${complexityThreshold})*\n\n`);
        }

        // Reviewer Cognitive Load Section
        tooltip.appendMarkdown(`\n---\n\n### Reviewer Cognitive Load (Staged PR)\n\n`);
        
        if (!this.isReviewerEnabled) {
            tooltip.appendMarkdown(`*Reviewer tracking is currently disabled in settings.*\n\n`);
        } else if (this.reviewerFileCount === 0) {
            tooltip.appendMarkdown(`*No files currently staged.*\n\n`);
        } else {
            tooltip.appendMarkdown(`* **Files Staged:** ${this.reviewerFileCount}\n\n`);
            
            // LOC check against settings threshold
            const locLimit = config.get<number>('reviewerLocThreshold', 400);
            const locIcon = this.reviewerLoc > locLimit ? '$(warning) *Too High!*' : '$(check)';
            tooltip.appendMarkdown(`* **Lines Modified:** ${this.reviewerLoc} ${locIcon}\n\n`);
            
            if (this.reviewerLoc > locLimit) {
                tooltip.appendMarkdown(`> **Suggestion:** Consider splitting this into smaller PRs to prevent reviewer fatigue.\n\n`);
            }

            const compIcon = this.reviewerComplexityFiles > 0 ? '$(warning) *Reviewer Fatigue Risk!*' : '$(check)';
            tooltip.appendMarkdown(`* **Files exceeding Complexity (${complexityThreshold}):** ${this.reviewerComplexityFiles} ${compIcon}\n\n`);

            // Complexity of staged files
            if (this.reviewerComplexityFiles > 0) {
                this.complexFilesList.slice(0, 3).forEach(f => {
                    tooltip.appendMarkdown(`  - \`${f.name}\` (Score: **${f.score}**)\n`);
                });
                tooltip.appendMarkdown(`> **Suggestion:** Consider refactoring these complex files into smaller, more readable functions.\n\n`);
            }

            // Zombie Dependencies
            if (this.zombieNames.length > 0) {
                tooltip.appendMarkdown(`$(warning) **Unused Dependencies Found:**\n`);
                this.zombieNames.forEach(z => tooltip.appendMarkdown(`  - \`${z}\`\n`));
                tooltip.appendMarkdown(`> **Suggestion:** Please remove these from \`package.json\` before submitting to keep the project clean.\n\n`);
            }
        }

        this.statusBarItem.tooltip = tooltip;
    }
}