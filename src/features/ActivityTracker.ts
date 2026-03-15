import * as vscode from 'vscode';

export class ActivityTracker {
    // 1. Tab Switching Metric - TODO: Fill in!!
    public totalTabSwitches: number = 0;

    // 2. Add-Delete Metrics
    public charactersAdded: number = 0;
    public charactersDeleted: number = 0;

    // 3. Read-Write Metrics
    public lastWriteTime: number = Date.now();
    public isScrolling: boolean = false;

    // 4. AI Usage
    public recentPastedCharacters: number = 0;

    constructor() {}

    public onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        this.lastWriteTime = Date.now();
        this.isScrolling = false;

        for (const change of event.contentChanges) {
            if (change.text === '') {
                this.charactersDeleted += change.rangeLength;
            } else {
                this.charactersAdded += change.text.length;
                if (change.text.length > 50) {
                    this.recentPastedCharacters = change.text.length;
                }
            }
        }
    }

    public onScrolled(event: vscode.TextEditorVisibleRangesChangeEvent) {
        this.isScrolling = true;
    }

    public getAddDeleteRatio(): number {
        if (this.charactersDeleted === 0) {
            return this.charactersAdded > 0 ? Infinity : 0;
        }
        return this.charactersAdded / this.charactersDeleted;
    }

    public getTimeSinceLastWriteMs(): number {
        return Date.now() - this.lastWriteTime;
    }

}