import * as vscode from "vscode";
import * as path from "path";
import { WINDOW_DURATION, SWITCH_THRESHOLD } from "./constants";

/**
 * Tracks context-switch events using a sliding window and fires an alert.
 */
export class ContextSwitchTracker implements vscode.Disposable {
  private switchTimestamps: number[] = [];

  private lastFilePath: string | undefined;
  private lastFolderPath: string | undefined;

  private readonly listener: vscode.Disposable;
  private readonly onThresholdExceeded: () => void;

  constructor(onThresholdExceeded: () => void) {
    this.onThresholdExceeded = onThresholdExceeded;

    this.listener = vscode.window.onDidChangeActiveTextEditor((editor) =>
      this.handleEditorChange(editor)
    );
  }

  private handleEditorChange(
    editor: vscode.TextEditor | undefined
  ): void {
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const folderPath = path.dirname(filePath);

    const fileChanged =
      this.lastFilePath !== undefined && filePath !== this.lastFilePath;
    const folderChanged =
      this.lastFolderPath !== undefined && folderPath !== this.lastFolderPath;

    if (fileChanged || folderChanged) {
      this.recordSwitch();
    }

    this.lastFilePath = filePath;
    this.lastFolderPath = folderPath;
  }

  private recordSwitch(): void {
    const now = Date.now();

    // Append timestamps
    this.switchTimestamps.push(now);
    this.switchTimestamps = this.switchTimestamps.filter(
      (t) => now - t < WINDOW_DURATION
    );

    console.log(
      `[flow-state] Context switches in last 10 min: ${this.switchTimestamps.length}`
    );

    if (this.switchTimestamps.length > SWITCH_THRESHOLD) {
      this.onThresholdExceeded();
    }
  }

  dispose(): void {
    this.listener.dispose();
  }
}