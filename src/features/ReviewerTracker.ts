import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { StatusBar } from '../StatusBar';
import { calculateCognitiveComplexity } from '../utils/complexityCalculator';
import { getZombieNames } from '../zombiePackages';

const exec = util.promisify(cp.exec);

export class ReviewerTracker {
    /**
     * Tracks the "reviewer load" for a pull request by analyzing the staged changes in the git repository. It calculates:
     * - Total lines of code changed (added + deleted)
     * - Number of complex files (based on cognitive complexity)
     * - Names of zombie packages (unused dependencies) for better suggestions
     * 
     * The results are sent to the StatusBar to provide feedback to the developer before they create a PR.
     */

    private statusBar: StatusBar;

    /**
     * Constructs the ReviewerTracker with the provided status bar.
     */
    constructor(statusBar: StatusBar) {
        this.statusBar = statusBar;

        // Re-analyze when settings change
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flow-state')) {
                this.analyzePR();
            }
        });
    }

    /**
     * Analyzes the staged changes in the git repository to calculate reviewer load metrics and updates the status bar with the results.
     */
    public async analyzePR() {
        const config = vscode.workspace.getConfiguration('flow-state');
        const isEnabled = config.get<boolean>('enableReviewerLoadTracking', true);
        const complexityThreshold = config.get<number>('complexityThreshold', 15);
        let complexFilesList: { name: string, score: number }[] = []; // Track names and scores

        if (!isEnabled) {
            this.statusBar.updateReviewerStats(false, 0, 0, 0, [], []);
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return; }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        try {
            // Run git command to get staged files and their Added/Deleted line counts
            const { stdout } = await exec('git diff --cached --numstat --relative', { cwd: workspacePath });
            
            if (!stdout || stdout.trim() === '') {
                this.statusBar.updateReviewerStats(true, 0, 0, 0, [], []);
                return;
            }

            const lines = stdout.trim().split('\n');
            let totalFiles = 0;
            let totalLoc = 0;
            let complexFilesCount = 0;

            for (const line of lines) {
                // git --numstat outputs: "added   deleted   filename" (e.g., "10    2    src/app.ts")
                // Better regex to safely extract the FULL file path (even if it has spaces)
                const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
                if (!match) { continue; }
                
                const addedStr = match[1];
                const deletedStr = match[2];
                let filePath = match[3];

                // Git wraps paths with spaces in quotes, so we remove them
                if (filePath.startsWith('"') && filePath.endsWith('"')) {
                    filePath = filePath.slice(1, -1);
                }

                // Skip binary files which show up as "-"
                if (addedStr === '-' || deletedStr === '-') { continue; }

                totalFiles++;

                // Skip .json and .lock files from LOC and complexity
                if (filePath.endsWith('.json') || filePath.endsWith('.lock')) { continue; }

                totalLoc += parseInt(addedStr, 10) + parseInt(deletedStr, 10);

                // Check Cognitive Complexity
                if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) {
                    const fullPath = path.join(workspacePath, filePath);
                    
                    try {
                        const fileData = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                        const fileText = Buffer.from(fileData).toString('utf8');
                        
                        const score = calculateCognitiveComplexity(fileText);
                        
                        if (score > complexityThreshold) {
                            complexFilesCount++;
                            // Add the filename and score to our list for detailed suggestions
                            complexFilesList.push({ name: filePath, score: score });
                        }
                    } catch (err) {
                        console.error(`Flow-State: Could not read file for complexity calculation: ${filePath}`);
                    }
                }
            }

            // Fetch the specific names of zombie packages for the tooltip
            const zombieNames = await getZombieNames(workspaceFolders);

            // Send all the detailed calculated data to the Status Bar UI
            this.statusBar.updateReviewerStats(
                true, 
                totalFiles, 
                totalLoc, 
                complexFilesCount, 
                zombieNames, 
                complexFilesList
            );
        } catch (error) {
            console.error('Flow-State: Failed to run git diff.', error);
            // Default to empty stats on error
            this.statusBar.updateReviewerStats(true, 0, 0, 0, [], []);
        }
    }
}