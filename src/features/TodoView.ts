import * as vscode from 'vscode';

// Define Task class to represent each task
class Task {
    constructor(public label: string, public isAddTaskButton: boolean = false) {}
}

export class TodoView implements vscode.TreeDataProvider<Task> {
    /**
     * Implements a To-Do list view using VSCode's TreeView API. It allows users to add and remove tasks, and displays them in a hierarchical tree structure.
     * The view includes:
     * - An "Add Task" button at the top to quickly add new tasks.
     * - Each task can be checked off (using a checkbox) to indicate completion.
     * - Tasks can be removed from the list.
     */

    private tasks: Task[] = []; // Store tasks in this array

    // Initialize with sample tasks if needed
    constructor() {
        this.tasks.push(new Task('Add a Task...', true)); // This is the "Add Task" button task
        this.tasks.push(new Task('Sample Task 1'));
        this.tasks.push(new Task('Sample Task 2'));
    }

    getTreeItem(element: Task): vscode.TreeItem {
        const item = new vscode.TreeItem(element.label);

        if (element.isAddTaskButton) {
            item.command = {
                command: 'todo-list.addTask',
                title: 'Add Task',
            };
            item.iconPath = new vscode.ThemeIcon('add');
            item.contextValue = 'addTaskButton';
        } else {
            item.contextValue = 'task';

            item.checkboxState = vscode.TreeItemCheckboxState.Unchecked;

        }

        return item;
    }

    getChildren(element?: Task): Thenable<Task[]> {
        return Promise.resolve(this.tasks);  // Return all tasks
    }

    /**
     * Adds a new task with the specified label to the list and updates the TreeView.
     */
    addTask(label: string) {
        this.tasks.push(new Task(label));  // Add task to the list
        this._onDidChangeTreeData.fire(undefined);  // Trigger update to TreeView
    }

    /**
     * Removes a task with the specified label from the list and updates the TreeView.
     */
    removeTask(label: string) {
        this.tasks = this.tasks.filter(task => task.label !== label);  // Filter out the task to remove
        this._onDidChangeTreeData.fire(undefined);  // Trigger update to TreeView
    }

    private _onDidChangeTreeData: vscode.EventEmitter<Task | undefined> = new vscode.EventEmitter<Task | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Task | undefined> = this._onDidChangeTreeData.event;
}