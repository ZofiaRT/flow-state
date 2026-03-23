import * as vscode from 'vscode';

// Define Task class to represent each task
class Task {
    constructor(public label: string, public isAddTaskButton: boolean = false) {}
}

export class TodoView implements vscode.TreeDataProvider<Task> {
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

            // ✅ Add checkbox
            item.checkboxState = vscode.TreeItemCheckboxState.Unchecked;

            // When clicked, remove task
            item.command = {
                command: 'todo-list.removeTask',
                title: 'Remove Task',
                arguments: [element.label]
            };
        }

        return item;
    }

    getChildren(element?: Task): Thenable<Task[]> {
        return Promise.resolve(this.tasks);  // Return all tasks
    }

    // Add a new task
    addTask(label: string) {
        this.tasks.push(new Task(label));  // Add task to the list
        this._onDidChangeTreeData.fire(undefined);  // Trigger update to TreeView
    }

    // Remove a task
    removeTask(label: string) {
        this.tasks = this.tasks.filter(task => task.label !== label);  // Filter out the task to remove
        this._onDidChangeTreeData.fire(undefined);  // Trigger update to TreeView
    }

    private _onDidChangeTreeData: vscode.EventEmitter<Task | undefined> = new vscode.EventEmitter<Task | undefined>();
    readonly onDidChangeTreeData: vscode.Event<Task | undefined> = this._onDidChangeTreeData.event;
}