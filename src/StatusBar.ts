import * as vscode from 'vscode';

export class StatusBar {
    public statusBarItem: vscode.StatusBarItem;
    private complexityScore: number = 0;

    private isMasterEnabled: boolean = true;
    private isComplexityEnabled: boolean = true;

    // Reviewer Tracking Variables
    private isReviewerEnabled: boolean = true;
    private reviewerFileCount: number = 0;
    private reviewerLoc: number = 0;
    private reviewerComplexityFiles: number = 0; // Tracks how many staged files have complexity > 15
    private hasZombieWarning: boolean = false;

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

    public updateReviewerStats(enabled: boolean, fileCount: number, loc: number, complexFiles: number, hasZombies: boolean) {
        this.isReviewerEnabled = enabled;
        this.reviewerFileCount = fileCount;
        this.reviewerLoc = loc;
        this.reviewerComplexityFiles = complexFiles;
        this.hasZombieWarning = hasZombies;

        // Check for Reviewer Warnings
        const locConfig = vscode.workspace.getConfiguration('flow-state').get<number>('reviewerLocThreshold', 400);
        const hasWarning = loc > (locConfig ?? 400) || complexFiles > 0 || hasZombies;

        // If there is a warning, turn the status bar yellow!
        if (enabled && hasWarning) {
            this.statusBarItem.text = `$(warning) PR Load High!`;
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
            const complexityThreshold = vscode.workspace.getConfiguration('flow-state').get<number>('complexityThreshold', 15);
            if (this.isComplexityEnabled && score > complexityThreshold) {
                this.statusBarItem.text = "$(warning) Flow State: Warning";
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            } else {
                this.statusBarItem.text = "$(pulse) Flow State: Optimal";
                this.statusBarItem.backgroundColor = undefined;
            }
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

    public flashSuccessBar(message: string) {
        if (this.statusBarTimeout) { clearTimeout(this.statusBarTimeout); }

        this.activeStatusBarWarning = message; 
        
        this.statusBarItem.text = `✨ ${message}`; 
        this.statusBarItem.backgroundColor = undefined;
        
        this.updateHoverPopup();

        this.statusBarTimeout = setTimeout(() => {
            this.activeStatusBarWarning = null;
            this.updateComplexity(this.complexityScore);
        }, 5000);
    }

    public showTemporaryWarning(message: string) {
        this.flashStatusBar(message); // Reuse the flash method for the UI

        if (this.tooltipTimeout) { clearTimeout(this.tooltipTimeout); }
        this.activeTooltipWarning = message;
        this.updateHoverPopup();

        this.tooltipTimeout = setTimeout(() => {
            this.activeTooltipWarning = null;
            this.updateHoverPopup();
        }, 60000);
    }

    public updateHoverPopup() {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        // Base header
        tooltip.appendMarkdown(`### Flow-State Session\n\n---\n\n`);

        if (!this.isMasterEnabled) {
            tooltip.appendMarkdown(`*Cognitive Load Tracking is currently disabled in settings.*`);
            this.statusBarItem.tooltip = tooltip;
            return;
        }

        // Main Cognitive Load Section
        tooltip.appendMarkdown(`### Cognitive Load\n\n`);

        const hasActivityWarning = !!this.activeTooltipWarning;
        const complexityThreshold = vscode.workspace.getConfiguration('flow-state').get<number>('complexityThreshold', 15);

        const hasComplexityWarning = this.isComplexityEnabled && this.complexityScore > complexityThreshold;

        if (hasActivityWarning || hasComplexityWarning) {
            tooltip.appendMarkdown(`#### Active Alerts\n\n`);
            if (hasActivityWarning) {
                tooltip.appendMarkdown(`* ${this.activeTooltipWarning}\n\n`);
            }
            if (hasComplexityWarning) {
                tooltip.appendMarkdown(`* High Code Complexity (Score: ${this.complexityScore})\n\n`);
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
            const locConfig = vscode.workspace.getConfiguration('flow-state').get<number>('reviewerLocThreshold', 400);
            const locIcon = this.reviewerLoc > (locConfig ?? 400) ? '$(warning) *Too High!*' : '$(check)';
            tooltip.appendMarkdown(`* **Lines Modified:** ${this.reviewerLoc} ${locIcon}\n\n`);

            // Complexity check
            const compIcon = this.reviewerComplexityFiles > 0 ? '$(warning) *Reviewer Fatigue Risk!*' : '$(check)';
            tooltip.appendMarkdown(`* **Files with Complexity Score > ${complexityThreshold}:** ${this.reviewerComplexityFiles} ${compIcon}\n\n`);

            // Zombie check
            if (this.hasZombieWarning) {
                tooltip.appendMarkdown(`* **Zombie Packages:** $(warning) *Potential unused packages in package.json!*\n\n`);
            }
        }

        this.statusBarItem.tooltip = tooltip;
    }
}