import * as vscode from 'vscode';

export class StatusBar {
    public statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(pulse) Flow State: Optimal";
        
        this.updateHoverPopup();
        this.statusBarItem.show();
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    public updateHoverPopup(
        tabSwitches = 0, 
        thrashingWarnings = 0, 
        struggleWarnings = 0, 
        complexityScore = 0
    ) {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### Flow-State Session\n\n---\n\n`);
        tooltip.appendMarkdown(`**Focus Stats:**\n\n`);
        tooltip.appendMarkdown(`* $(files) Tab Switches: **${tabSwitches}**\n`);
        tooltip.appendMarkdown(`* $(warning) Thrashing Warnings: **${thrashingWarnings}**\n`);
        tooltip.appendMarkdown(`* $(error) Struggle Warnings: **${struggleWarnings}**\n\n`);
        
        tooltip.appendMarkdown(`---\n\n### Code Complexity\n\n`);
        tooltip.appendMarkdown(`* Current File Score: **${complexityScore}** *(Threshold: 15)*\n\n`);
        tooltip.appendMarkdown(`---\n\n### Deep Nesting Hotspots\n\n`);

        this.statusBarItem.tooltip = tooltip;
    }
}