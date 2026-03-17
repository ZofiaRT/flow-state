import * as vscode from 'vscode';

export class StatusBar {
    public statusBarItem: vscode.StatusBarItem;
    private complexityScore: number = 0;

    private isMasterEnabled: boolean = true;
    private isComplexityEnabled: boolean = true;

    private activeStatusBarWarning: string | null = null;
    private activeTooltipWarning: string | null = null;
    
    private statusBarTimeout: NodeJS.Timeout | null = null;
    private tooltipTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(pulse) Flow State: Optimal";
        this.statusBarItem.command = 'flow-state.openDashboard';

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
        const hasComplexityWarning = this.isComplexityEnabled && this.complexityScore > 15;

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
            tooltip.appendMarkdown(`* Current File Score: **${this.complexityScore}** *(Threshold: 15)*\n\n`);
        }

        this.statusBarItem.tooltip = tooltip;
    }
}