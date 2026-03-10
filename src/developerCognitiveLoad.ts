import * as vscode from 'vscode';

export class CognitiveLoadTracker {
    public statusBarItem: vscode.StatusBarItem;

    public nestingIncidents: { file: string, uri: vscode.Uri, line: number, level: number, time: Date }[] = [];
    public totalTabSwitches = 0;
    public thrashingWarningsFired = 0;
    public struggleWarningsFired = 0;
    public currentComplexityScore = 0;

    private charactersTyped = 0;
    private backspacesTyped = 0;
    private fileSwitchTimestamps: number[] = [];
    private lastKeystrokeTime = Date.now();
    private isScrolling = false;

    // State trackers so we don't spam the warning counts when evaluating instantly
    private isCurrentlyThrashing = false;
    private isCurrentlyStruggling = false;

    private readonly THRASHING_WINDOW_MS = 2 * 60 * 1000; 
    private readonly THRASHING_LIMIT = 5; 
    private readonly NESTING_LIMIT = 4; 
    private readonly STRUGGLE_TIME_MS = 3 * 60 * 1000; 

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = "$(pulse) Flow State: Optimal";
        this.statusBarItem.show();
        
        this.updateHoverPopup();

        // Check for time-based states (like staring at the screen) every 5 seconds
        setInterval(() => this.evaluateCognitiveLoad(), 5000);

        // Reset text metrics every 60 seconds so you can "recover" from a struggle warning
        setInterval(() => {
            this.charactersTyped = 0;
            this.backspacesTyped = 0;
            this.evaluateCognitiveLoad(); // Refresh UI after reset
        }, 60000);
    }

    public onEditorChanged(editor: vscode.TextEditor | undefined) {
        if (!editor) { return; }
        const now = Date.now();
        this.totalTabSwitches++; 
        this.fileSwitchTimestamps.push(now);
        this.fileSwitchTimestamps = this.fileSwitchTimestamps.filter(t => now - t < this.THRASHING_WINDOW_MS);
        
        this.evaluateCognitiveLoad(); 
    }

    public onDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        this.lastKeystrokeTime = Date.now();
        this.isScrolling = false;

        for (const change of event.contentChanges) {
            if (change.text === '') {
                this.backspacesTyped += change.rangeLength;
            } else {
                this.charactersTyped += change.text.length;
                const currentLine = event.document.lineAt(change.range.start.line);
                const indentationLevel = this.calculateIndentationLevel(currentLine.text);
                const lineNum = change.range.start.line + 1;
                
                if (indentationLevel >= this.NESTING_LIMIT) {
                    const isDuplicate = this.nestingIncidents.some(inc => 
                        inc.uri.fsPath === event.document.uri.fsPath && inc.line === lineNum
                    );

                    // Only add to the popup if it's a new line we haven't warned you about yet
                    if (!isDuplicate) {
                        this.nestingIncidents.push({
                            file: event.document.fileName.split(/[/\\]/).pop() || 'Unknown File',
                            uri: event.document.uri, 
                            line: lineNum, 
                            level: indentationLevel,
                            time: new Date()
                        });
                        this.showWarning(`High Nesting Penalty! You are coding ${indentationLevel} levels deep.`);
                    }
                }
            }
        }
        
        this.evaluateCognitiveLoad(); 
    }

    public onScrolled(event: vscode.TextEditorVisibleRangesChangeEvent) {
        this.isScrolling = true;
    }

    private calculateIndentationLevel(lineText: string): number {
        const leadingWhitespace = lineText.match(/^[\s\t]*/)?.[0] || "";
        let spaces = 0;
        for (const char of leadingWhitespace) {
            if (char === '\t') { spaces += 4; }
            else if (char === ' ') { spaces += 1; }
        }
        return Math.floor(spaces / 4);
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
        let isHighLoad = false;
        let loadReason = "";

        // 1. Evaluate Thrashing
        const isThrashing = this.fileSwitchTimestamps.length >= this.THRASHING_LIMIT;
        if (isThrashing) {
            isHighLoad = true;
            loadReason = "File Thrashing Detected";
            if (!this.isCurrentlyThrashing) {
                this.thrashingWarningsFired++;
                this.isCurrentlyThrashing = true;
            }
        } else {
            this.isCurrentlyThrashing = false;
        }

        // 2. Evaluate Struggle (Only if not already thrashing)
        let isStruggling = false;
        if (this.charactersTyped > 20 && (this.backspacesTyped / this.charactersTyped) > 0.4) {
            isStruggling = true;
        }

        if (isStruggling && !isHighLoad) {
            isHighLoad = true;
            loadReason = "High Edit-to-Backspace Ratio";
            if (!this.isCurrentlyStruggling) {
                this.struggleWarningsFired++;
                this.isCurrentlyStruggling = true;
            }
        } else if (!isStruggling) {
            this.isCurrentlyStruggling = false;
        }

        // 3. Evaluate Screen Staring
        const timeSinceLastKey = Date.now() - this.lastKeystrokeTime;
        if (!isHighLoad && this.isScrolling && timeSinceLastKey > this.STRUGGLE_TIME_MS) {
            isHighLoad = true;
            loadReason = "High Read-to-Write Ratio (Stuck?)";
        }

        // 4. Evaluate PR Cognitive Load (Social Sustainability)
        if (!isHighLoad) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const documentText = editor.document.getText();
                this.currentComplexityScore = this.calculateCognitiveComplexity(documentText);
                
                if (this.currentComplexityScore > 15) {
                    isHighLoad = true;
                    loadReason = `High Code Complexity (Score: ${this.currentComplexityScore})`;
                }
            } else {
                this.currentComplexityScore = 0; // Reset if no file is open
            }
        }

        // Apply instant color changes
        if (isHighLoad) {
            this.statusBarItem.text = `$(warning) High Cognitive Load: ${loadReason}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = "$(pulse) Flow State: Optimal";
            this.statusBarItem.backgroundColor = undefined;
        }

        this.updateHoverPopup();
    }

    private updateHoverPopup() {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        tooltip.appendMarkdown(`### 🚀 Flow-State Session\n\n---\n\n`);
        tooltip.appendMarkdown(`**Focus Stats:**\n\n`);
        tooltip.appendMarkdown(`* $(files) Tab Switches: **${this.totalTabSwitches}**\n`);
        tooltip.appendMarkdown(`* $(warning) Thrashing Warnings: **${this.thrashingWarningsFired}**\n`);
        tooltip.appendMarkdown(`* $(error) Struggle Warnings: **${this.struggleWarningsFired}**\n\n`);
        
        tooltip.appendMarkdown(`---\n\n### 🧠 Code Complexity\n\n`);
        tooltip.appendMarkdown(`* Current File Score: **${this.currentComplexityScore}** *(Threshold: 15)*\n\n`);
        tooltip.appendMarkdown(`---\n\n### ⚠️ Deep Nesting Hotspots\n\n`);
        
        if (this.nestingIncidents.length === 0) {
            tooltip.appendMarkdown(`*$(check) No deep nesting detected! Great job.*\n`);
        } else {
            const recent = [...this.nestingIncidents].reverse().slice(0, 3);
            for (const inc of recent) {
                const args = encodeURIComponent(JSON.stringify([{ path: inc.uri.fsPath, line: inc.line }]));
                tooltip.appendMarkdown(`* [$(go-to-file) Fix ${inc.file} (Line ${inc.line})](command:flow-state.teleport?${args}) - *${inc.level} levels deep*\n`);
            }
        }

        this.statusBarItem.tooltip = tooltip;
    }

    private lastWarningTime = 0;
    private showWarning(message: string) {
        const now = Date.now();
        if (now - this.lastWarningTime > 5 * 60 * 1000) {
            vscode.window.showInformationMessage(`Flow-State: ${message}`);
            this.lastWarningTime = now;
        }
    }
}