import * as vscode from 'vscode';
import { TodoView } from './features/TodoView';
import { CognitiveLoadTracker } from './features/DeveloperCognitiveLoadTracker';
import { PomodoroTimer } from './features/PomodoroTimer';
import { StatusBar } from './StatusBar';
import { checkZombiePackages } from './zombiePackages';
import { ActivityTracker } from './features/ActivityTracker';
import { ReviewerTracker } from './features/ReviewerTracker';
import * as path from 'path';
import { Dashboard } from './Dashboard';
import { ContextSwitchManager } from "./features/contextSwitch";
import { InactiveTabsManager } from './features/inactiveTabs';

function handleOnboarding(context: vscode.ExtensionContext) {
    const hasSeenOnboarding = context.globalState.get('flowState.hasSeenOnboarding');
    if (!hasSeenOnboarding) {
        const extensionId = context.extension.id;
        const walkthroughId = `${extensionId}#flowState.welcome`;

        vscode.commands.executeCommand('workbench.action.openWalkthrough', walkthroughId, false);
        context.globalState.update('flowState.hasSeenOnboarding', true);
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Initialize TodoView first
    const todoView = new TodoView();

    // Register the "Add Task" command
    let addTaskCommand = vscode.commands.registerCommand('todo-list.addTask', async () => {
        const taskName = await vscode.window.showInputBox({ prompt: 'Enter task name' });
        if (taskName) {
            todoView.addTask(taskName);  // Add the task to the list
        }
    });

    // Register the "Remove Task" command
    let removeTaskCommand = vscode.commands.registerCommand('todo-list.removeTask', async (taskName: string) => {
        if (taskName) {
            todoView.removeTask(taskName);  // Remove the task from the list
        }
    });

    context.subscriptions.push(addTaskCommand, removeTaskCommand);

    // Register the tree view in the sidebar
    const treeView = vscode.window.createTreeView('todoListView', {
        treeDataProvider: todoView,
        showCollapseAll: false,
        canSelectMany: false
    });

    treeView.onDidChangeCheckboxState(e => {
        for (const [item, state] of e.items) {
            if (state === vscode.TreeItemCheckboxState.Checked) {
                todoView.removeTask(item.label);
            }
        }
    });
    
    handleOnboarding(context);

    // Initialize core features
    const flowStateStatusBar = new StatusBar();
    const activityTracker = new ActivityTracker();
    const developerCognitiveLoadTracker = new CognitiveLoadTracker(flowStateStatusBar, activityTracker);
    const pomodoroTimer = new PomodoroTimer(developerCognitiveLoadTracker);
    const contextSwitchManager = new ContextSwitchManager(flowStateStatusBar);
    const inactiveTabsManager = new InactiveTabsManager();


    // Initialize the Reviewer Tracker
    const reviewerTracker = new ReviewerTracker(flowStateStatusBar);

    // Register event listeners
    const editorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(e =>
        developerCognitiveLoadTracker.onEditorChanged(e)
    );

    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(e => {
        activityTracker.onDocumentChanged(e);
        developerCognitiveLoadTracker.onDocumentChanged(e);
    });

    const scrollDisposable = vscode.window.onDidChangeTextEditorVisibleRanges(e => {
        activityTracker.onScrolled(e);
        developerCognitiveLoadTracker.evaluateCognitiveLoad();
    });

    // Create output channel
    const outputChannel = vscode.window.createOutputChannel('Flow-State');

    const zombieDisposable = vscode.commands.registerCommand('flow-state.checkZombiePackages', () => {
        checkZombiePackages(outputChannel);
    });

    const dashboardDisposable = vscode.commands.registerCommand('flow-state.openDashboard', () => {
        Dashboard.show(context.extensionUri, developerCognitiveLoadTracker, activityTracker, flowStateStatusBar, contextSwitchManager);
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

    const startPomodoroDisposable = vscode.commands.registerCommand('flow-state.startPomodoro', () => {
        pomodoroTimer.start();
    });

    const pausePomodoroDisposable = vscode.commands.registerCommand('flow-state.pausePomodoro', () => {
        pomodoroTimer.pause();
    });

    const resumePomodoroDisposable = vscode.commands.registerCommand('flow-state.resumePomodoro', () => {
        pomodoroTimer.resume();
    });

    const stopPomodoroDisposable = vscode.commands.registerCommand('flow-state.stopPomodoro', () => {
        pomodoroTimer.stop();
    });

    // Add all disposables to subscriptions	const inactiveTabsManager = new InactiveTabsManager();

    context.subscriptions.push(
        flowStateStatusBar,
        pomodoroTimer,
        contextSwitchManager,
        outputChannel,
        dashboardDisposable,
        contextSwitchManager,
        inactiveTabsManager,
        analyzePrDisposable,
        editorChangeDisposable,
        documentChangeDisposable,
        scrollDisposable,
        zombieDisposable,
        startPomodoroDisposable,
        pausePomodoroDisposable,
        resumePomodoroDisposable,
        stopPomodoroDisposable
    );
}

<<<<<<< todoList
function getWebviewContent() {
    return `
        <html>
            <body>
                <h1>To-Do List</h1>
                <ul id="todo-list">
                    <!-- Dynamic tasks will be listed here -->
                </ul>
                <input type="text" id="taskInput" placeholder="Enter a task" />
                <button id="addTaskButton">Add Task</button>

                <script>
                    const vscode = acquireVsCodeApi(); // VS Code API for messaging

                    // Function to add a new task
                    document.getElementById('addTaskButton').addEventListener('click', () => {
                        const taskInput = document.getElementById('taskInput');
                        const newTask = taskInput.value;
                        if (newTask) {
                            vscode.postMessage({ command: 'add', text: newTask }); // Send the task to the extension
                            taskInput.value = ''; // Clear input field
                        }
                    });

                    // Function to remove a task
                    function removeTask(index) {
                        vscode.postMessage({ command: 'remove', index: index }); // Send the index to remove
                    }

                    // Example: Dynamically update tasks (to be updated by the backend)
                    function updateTaskList(tasks) {
                        const list = document.getElementById('todo-list');
                        list.innerHTML = ''; // Clear the existing list
                        tasks.forEach((task, index) => {
                            const li = document.createElement('li');
                            li.textContent = task;
                            const removeButton = document.createElement('button');
                            removeButton.textContent = 'Remove';
                            removeButton.onclick = () => removeTask(index);
                            li.appendChild(removeButton);
                            list.appendChild(li);
                        });
                    }

                    // Listen for messages from the extension (to update the task list)
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateTasks') {
                            updateTaskList(message.tasks);
                        }
                    });
                </script>
            </body>
        </html>
    `;
}

export function deactivate() {}
=======
export function deactivate() { }
>>>>>>> master
