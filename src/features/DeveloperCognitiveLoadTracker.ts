import * as vscode from 'vscode';
import { StatusBar } from '../StatusBar';
import { ActivityTracker } from './ActivityTracker';
import { calculateCognitiveComplexity } from '../utils/complexityCalculator';

export class CognitiveLoadTracker {
    public currentComplexityScore = 0;
    private previousComplexityScore = 0;
    private statusBar: StatusBar;
    private activityTracker: ActivityTracker;

    constructor(statusBar: StatusBar, activityTracker: ActivityTracker) {
        this.statusBar = statusBar;
        this.activityTracker = activityTracker;

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flow-state')) {
                this.evaluateCognitiveLoad();
            }
        });

        this.evaluateCognitiveLoad();
    }

    public onEditorChanged(editor: vscode.TextEditor | undefined) {
        this.evaluateCognitiveLoad(); 
    }

    public onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && event.document === activeEditor.document) {
            this.evaluateCognitiveLoad(); 
        }
    }

    public evaluateCognitiveLoad() {
        const config = vscode.workspace.getConfiguration('flow-state');
        
        const isMasterEnabled = config.get<boolean>('enableCognitiveLoadTracker', true);
        const isComplexityEnabled = config.get<boolean>('enableCodeComplexity', true);
        const isReadWriteEnabled = config.get<boolean>('enableReadWriteTracking', true);
        const isAddDeleteEnabled = config.get<boolean>('enableAddDeleteTracking', true);
        const complexityThreshold = config.get<number>('complexityThreshold', 15);
        const readWriteThresholdMs = config.get<number>('readWriteTimeThresholdSeconds', 900) * 1000;
        const addDeleteRatioThreshold = config.get<number>('addDeleteRatioThreshold', 0.3);

        const isInsertionEnabled = config.get<boolean>('enableLargeInsertionTracking', true);
        const insertionThreshold = config.get<number>('largeInsertionThresholdChars', 600);

        this.statusBar.updateConfigState(isMasterEnabled, isComplexityEnabled);

        if (!isMasterEnabled) {
            this.currentComplexityScore = 0;
            this.previousComplexityScore = 0;
            this.statusBar.updateComplexity(0); 
            return;
        }

        // 1. Evaluate Code Complexity
        if (isComplexityEnabled) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const documentText = editor.document.getText();
                this.currentComplexityScore = calculateCognitiveComplexity(documentText);
                
                if (this.currentComplexityScore > complexityThreshold) {
                    if (this.currentComplexityScore > this.previousComplexityScore) {
                        this.statusBar.flashStatusBar(`Complexity Increased (Score: ${this.currentComplexityScore})`);
                    }
                }
                
                this.previousComplexityScore = this.currentComplexityScore;

            } else {
                this.currentComplexityScore = 0;
                this.previousComplexityScore = 0;
            }
        }

        // 2. Evaluate Add-Delete Ratio
        if (isAddDeleteEnabled) {
            const ratio = this.activityTracker.getAddDeleteRatio();
            if (this.activityTracker.charactersAdded > 0 && this.activityTracker.charactersDeleted > 100 && ratio < addDeleteRatioThreshold) {
                this.statusBar.showTemporaryWarning("High Deletion Rate (Stuck?)");
                this.activityTracker.charactersDeleted = 0;
                this.activityTracker.charactersAdded = 0;
            }
        }

        // 3. Evaluate Read-Write Ratio
        if (isReadWriteEnabled) {
            const timeReadingMs = this.activityTracker.getTimeSinceLastWriteMs();
            if (this.activityTracker.isScrolling && timeReadingMs > readWriteThresholdMs) { 
                this.statusBar.showTemporaryWarning("Heavy Reading/Tracing");
                this.activityTracker.lastWriteTime = Date.now();
            }
        }

        // 4. Evaluate Large (AI) Insertions
        if (isInsertionEnabled && this.activityTracker.recentPastedCharacters >= insertionThreshold) {
            this.statusBar.showTemporaryWarning(`Large Code Insertion (${this.activityTracker.recentPastedCharacters} chars) - High Review Load!`);
            this.activityTracker.recentPastedCharacters = 0;
        }

        this.statusBar.updateComplexity(this.currentComplexityScore);
        console.log(`Cognitive Load Evaluated: Complexity=${this.currentComplexityScore}, Add/Delete Ratio=${isAddDeleteEnabled ? this.activityTracker.getAddDeleteRatio().toFixed(2) : 'N/A'}, Time Since Last Write=${isReadWriteEnabled ? (this.activityTracker.getTimeSinceLastWriteMs() / 1000).toFixed(1) + 's' : 'N/A'}`);
    }
}