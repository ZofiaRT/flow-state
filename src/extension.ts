import * as vscode from 'vscode';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { StatusBar } from './StatusBar';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { ReviewerTracker } from './features/ReviewerTracker';

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "flow-state" is now active!');

    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);
    
    // Initialize the Reviewer Tracker
    const reviewerTracker = new ReviewerTracker(flowStateStatusBar);

    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(e => developerCognitiveLoadTracker.onEditorChanged(e));
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => { 
        activityTracker.onDocumentChanged(e);
        developerCognitiveLoadTracker.onDocumentChanged(e);
    });
    const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
        activityTracker.onScrolled(e);
        developerCognitiveLoadTracker.evaluateCognitiveLoad(); 
    });

    const outputChannel = vscode.window.createOutputChannel('Flow-State');

    const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
        checkZombiePackages(outputChannel);
    });

    // Register the Manual PR Check Command
    const analyzePrDisposable = vscode.commands.registerCommand('flow-state.analyzePR', () => {
        reviewerTracker.analyzePR();
        vscode.window.showInformationMessage("Flow-State: Reviewer Cognitive Load Analyzed!");
    });

    // Listen for Git Staging changes automatically
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension) {
        gitExtension.activate().then(() => {
            const gitApi = gitExtension.exports.getAPI(1);
            
            // Helper function to attach listener to a repository
            const attachRepoListener = (repo: any) => {
                repo.state.onDidChange(() => reviewerTracker.analyzePR());
            };

            // Attach to any repos already found
            gitApi.repositories.forEach(attachRepoListener);
            
            // Attach to any repos Git finds in the future (solves the startup bug!)
            gitApi.onDidOpenRepository(attachRepoListener);
        });
    }

    // Run it once on startup just in case files are already staged
    reviewerTracker.analyzePR();

    context.subscriptions.push(
        flowStateStatusBar,
        outputChannel,
        zombieDisposable,
        analyzePrDisposable,
        editorChangeDisposable,
        documentChangeDisposable,
        scrollDisposable
    );
}

export function deactivate() {}
