import * as vscode from 'vscode';
import { StatusBar } from '../StatusBar';

export class CognitiveLoadTracker {
    public currentComplexityScore = 0;
    private statusBar: StatusBar;

    constructor(statusBar: StatusBar) {
        this.statusBar = statusBar;

        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flow-state.enableCognitiveComplexity')) {
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

        private calculateCognitiveComplexity(text: string): number {
        let score = 0;
        let nestingLevel = 0;
        const lines = text.split('\n');

        for (let line of lines) {
            line = line.trim();
            // Ignore blank lines and simple single-line comments
            if (line.startsWith('//') || line === '') { continue; }

            // --- Rule 2 & Rule 3 from the paper: Breaks in Linear Flow & Nesting Penalty ---
            // For each of these control structures, we add +1 for breaking the top-to-bottom 
            // reading flow (Rule 2), plus the current nesting level (Rule 3).

            // Check for 'if' statements
            if (line.match(/\bif\s*\(/)) { 
                score += 1; // Rule 2: Break in flow
                score += nestingLevel; // Rule 3: Nesting penalty
            }
            
            // Check for 'for' loops
            if (line.match(/\bfor\s*\(/)) { 
                score += 1 + nestingLevel; 
            }
            
            // Check for 'while' loops
            if (line.match(/\bwhile\s*\(/)) { 
                score += 1 + nestingLevel; 
            }
            
            // Check for 'catch' blocks
            if (line.match(/\bcatch\s*\(/)) { 
                score += 1 + nestingLevel; 
            }
            
            // Check for 'switch' statements
            if (line.match(/\bswitch\s*\(/)) { 
                score += 1 + nestingLevel; 
            }

            // --- Rule 2 only: 'else' statements ---
            // According to Campbell (2018), 'else' breaks the flow (+1), but it 
            // does not receive a nesting penalty. ('else if' is handled by the 'if' regex above).
            if (line.match(/\belse\b/) && !line.match(/\belse if\b/)) { 
                score += 1; 
            }

            // --- Nesting Tracker ---
            // When we see an open curly brace, we go one level deeper into the nesting context
            if (line.includes('{')) { 
                nestingLevel += 1; 
            }
            
            // When we see a closing brace, we step back out (Math.max ensures it never drops below 0)
            if (line.includes('}')) { 
                nestingLevel = Math.max(0, nestingLevel - 1); 
            }
        }
        
        return score;
    }

    private evaluateCognitiveLoad() {
        const config = vscode.workspace.getConfiguration('flow-state');
        const isEnabled = config.get<boolean>('enableCognitiveComplexity', true);

        if (!isEnabled) {
            this.currentComplexityScore = 0;
            this.statusBar.updateComplexity(0);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const documentText = editor.document.getText();
            this.currentComplexityScore = this.calculateCognitiveComplexity(documentText);
        } else {
            this.currentComplexityScore = 0; 
        }

        this.statusBar.updateComplexity(this.currentComplexityScore);
    }
}