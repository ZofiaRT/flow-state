import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { StatusBar } from '../StatusBar';
import { calculateCognitiveComplexity } from '../utils/complexityCalculator';
import { getZombieCount } from '../zombiePackages';

const exec = util.promisify(cp.exec);

export class ReviewerTracker {
    private statusBar: StatusBar;

    constructor(statusBar: StatusBar) {
        this.statusBar = statusBar;

        // Re-analyze when settings change
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flow-state')) {
                this.analyzePR();
            }
        });
    }

    public async analyzePR() {
        const config = vscode.workspace.getConfiguration('flow-state');
        const isEnabled = config.get<boolean>('enableReviewerLoadTracking', true);

        if (!isEnabled) {
            this.statusBar.updateReviewerStats(false, 0, 0, 0, false);
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return; }
        const workspacePath = workspaceFolders[0].uri.fsPath;

        try {
            // Run git command to get staged files and their Added/Deleted line counts
            const { stdout } = await exec('git diff --cached --numstat', { cwd: workspacePath });
            
            if (!stdout || stdout.trim() === '') {
                this.statusBar.updateReviewerStats(true, 0, 0, 0, false);
                return;
            }

            const lines = stdout.trim().split('\n');
            let totalFiles = 0;
            let totalLoc = 0;
            let complexFilesCount = 0;
            let hasZombieWarning = false;

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
                totalLoc += parseInt(addedStr, 10) + parseInt(deletedStr, 10);

                // Check Cognitive Complexity (Only for code .ts, .js files)
                if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) {
                    const fullPath = path.join(workspacePath, filePath);
                    try {
                        // Read the file content from the workspace
                        const fileData = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                        const fileText = Buffer.from(fileData).toString('utf8');
                        
                        // Use our shared complexity function
                        const score = calculateCognitiveComplexity(fileText);
                        if (score > 15) {
                            complexFilesCount++;
                        }
                    } catch (err) {
                        console.error(`Flow-State: Could not read file for complexity calculation: ${filePath}`);
                    }
                }
            }

            // Run the Zombie Package Check once for the whole workspace
            const actualZombieCount = await getZombieCount(vscode.workspace.workspaceFolders);
            if (actualZombieCount > 0) {
                hasZombieWarning = true;
            }

            // Send all the calculated data to the Status Bar UI
            this.statusBar.updateReviewerStats(true, totalFiles, totalLoc, complexFilesCount, hasZombieWarning);

        } catch (error) {
            console.error('Flow-State: Failed to run git diff.', error);
            // If git fails (e.g., not a git repo), default to 0
            this.statusBar.updateReviewerStats(true, 0, 0, 0, false);
        }
    }
}