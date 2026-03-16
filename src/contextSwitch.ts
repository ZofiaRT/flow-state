import * as vscode from "vscode";
import * as path from "path";

const WINDOW_DURATION = 10 * 60 * 1000;
const SWITCH_THRESHOLD = 8;

const SNOOZE_DURATION = 5 * 60 * 1000;
const DISMISS_COOLDOWN = 1 * 60 * 1000;

/** 
 * Tracks context-switch events using a sliding window and fires an alert. 
 */
export class ContextSwitchManager implements vscode.Disposable {

  private switchTimestamps: number[] = [];
  private cooldownExpiresAt = 0;

  private lastFilePath?: string;
  private lastFolderPath?: string;

  private listener: vscode.Disposable;

  private isShowingWarning = false;

  constructor() {
    this.listener = vscode.window.onDidChangeActiveTextEditor(editor =>
      this.handleEditorChange(editor)
    );
  }

  private handleEditorChange(editor: vscode.TextEditor | undefined) {
    if (!editor) return;

    const filePath = editor.document.uri.fsPath;
    const folderPath = path.dirname(filePath);

    const fileChanged =
      this.lastFilePath && filePath !== this.lastFilePath;

    const folderChanged =
      this.lastFolderPath && folderPath !== this.lastFolderPath;

    if (fileChanged || folderChanged) {
      this.recordSwitch();
    }

    this.lastFilePath = filePath;
    this.lastFolderPath = folderPath;
  }

  private async recordSwitch() {
    const now = Date.now();

    // Append timestamps
    this.switchTimestamps.push(now);

    this.switchTimestamps = this.switchTimestamps.filter(
      t => now - t < WINDOW_DURATION
    );

    console.log(
      `[flow-state] switches in window: ${this.switchTimestamps.length}`
    );

    if (
      this.switchTimestamps.length > SWITCH_THRESHOLD &&
      now > this.cooldownExpiresAt &&
      !this.isShowingWarning
    ) {
      this.showWarning();
    }
  }

  /** 
   * Handles showing the context-switch warning and managing cooldowns. 
   * - Snooze: suppresses the warning for 5 min; counting continues. 
   * - Dismissed: applies a short 1-min cooldown; counting continues. 
   */
  private async showWarning() {
    this.isShowingWarning = true;

    const now = Date.now();
    
    this.cooldownExpiresAt = now + DISMISS_COOLDOWN;
    
    vscode.window.showWarningMessage(
      "Frequent context switching detected! Try focusing on one task.",
      "Snooze"
    ).then(selection => {
      if (selection === "Snooze") {
        this.cooldownExpiresAt = Date.now() + SNOOZE_DURATION;
        console.log("[flow-state] Snoozed 5 minutes");
      }
    });
    
    this.switchTimestamps = [];
    console.log("[flow-state] Dismissed: 1 minute cooldown");
    
    setTimeout(() => {
      this.isShowingWarning = false;
    }, DISMISS_COOLDOWN);
  }

  dispose() {
    this.listener.dispose();
  }
}
