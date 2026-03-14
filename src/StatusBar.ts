import * as vscode from 'vscode';

export class StatusBar {
    public statusBarItem: vscode.StatusBarItem;
    private complexityScore: number = 0;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(pulse) Flow State: Optimal";
        
        this.updateHoverPopup();
        this.statusBarItem.show();
    }

    public dispose() {
        this.statusBarItem.dispose();
    }

    public updateComplexity(score: number) {
        this.complexityScore = score;
        
        if (this.complexityScore > 15) {
            this.statusBarItem.text = `$(warning) High Cognitive Load`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = "$(pulse) Flow State: Optimal";
            this.statusBarItem.backgroundColor = undefined;
        }

        this.updateHoverPopup();
    }

    public updateHoverPopup() {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### Flow-State Session\n\n---\n\n`);
        tooltip.appendMarkdown(`### Code Complexity\n\n`);
        tooltip.appendMarkdown(`* Current File Score: **${this.complexityScore}** *(Threshold: 15)*\n\n`);

        this.statusBarItem.tooltip = tooltip;
    }
}