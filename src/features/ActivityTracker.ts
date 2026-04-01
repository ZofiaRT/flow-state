import * as vscode from 'vscode';

export class ActivityTracker {
    /**
     * Tracks user activity in the editor, including:
     * - Characters added/deleted
     * - Time since last write
     * - Scrolling activity
     * - Potential AI-assisted code generation (inferred from large pastes)
     */

    // 1. Add-Delete Metrics
    public charactersAdded: number = 0;
    public charactersDeleted: number = 0;

    // 2. Read-Write Metrics
    public lastWriteTime: number = Date.now();
    public isScrolling: boolean = false;

    // 3. AI Usage
    public recentPastedCharacters: number = 0;

    constructor() {}

    /**
     * Handles changes to the active text document.
     * @param event  
     */
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

    /**
     * Handles scrolling events in the text editor.
     * @param event 
     */
    public onScrolled(event: vscode.TextEditorVisibleRangesChangeEvent) {
        this.isScrolling = true;
    }

    /**
     * Calculates the ratio of characters added to characters deleted.
     * @returns ratio or Infinity if only additions, or 0 if no changes
     */
    public getAddDeleteRatio(): number {
        if (this.charactersDeleted === 0) {
            return this.charactersAdded > 0 ? Infinity : 0;
        }
        return this.charactersAdded / this.charactersDeleted;
    }

    /**
     * Gets the time elapsed since the last write operation.
     * @returns time in milliseconds
     */
    public getTimeSinceLastWriteMs(): number {
        return Date.now() - this.lastWriteTime;
    }

}