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

    public updateHoverPopup() {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### Flow-State Session\n\n---\n\n`);
        tooltip.appendMarkdown(`---\n\n### Code Complexity\n\n`);
        tooltip.appendMarkdown(`* Current File Score: **${0}** *(Threshold: 15)*\n\n`);

        this.statusBarItem.tooltip = tooltip;
    }
}