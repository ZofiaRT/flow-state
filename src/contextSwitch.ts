import * as vscode from "vscode";
import * as path from "path";

const WINDOW_DURATION = 10 * 60 * 1000;
const SWITCH_THRESHOLD = 8;

const SNOOZE_DURATION = 5 * 60 * 1000;
const DISMISS_COOLDOWN = 1 * 60 * 1000;

const FILE_SWITCH_WEIGHT = 1;
const FOLDER_SWITCH_WEIGHT = 3;

/** 
 * Tracks context-switch events using a sliding window and fires an alert. 
 */
export class ContextSwitchManager implements vscode.Disposable {

  private switchEvents: { time: number; weight: number }[] = [];
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

    let weight = 0;

    const fileChanged =
      this.lastFilePath && filePath !== this.lastFilePath;

    const folderChanged =
      this.lastFolderPath && folderPath !== this.lastFolderPath;

    if (folderChanged) {
      weight = FOLDER_SWITCH_WEIGHT;
    } else if (fileChanged) {
      weight = FILE_SWITCH_WEIGHT;
    }

    if (weight > 0) {
      this.recordSwitch(weight);
    }

    this.lastFilePath = filePath;
    this.lastFolderPath = folderPath;
  }

  private async recordSwitch(weight: number) {
    const now = Date.now();

    // Append timestamps with weights
    this.switchEvents.push({ time: now, weight });

    this.switchEvents = this.switchEvents.filter(
      e => now - e.time < WINDOW_DURATION
    );

    const score = this.switchEvents.reduce(
      (sum, e) => sum + e.weight,
      0
    );

    console.log(`[flow-state] switch score: ${score}`);

   if (
      score > SWITCH_THRESHOLD &&
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
    
    this.switchEvents = [];
    console.log("[flow-state] Dismissed: 1 minute cooldown");
    
    setTimeout(() => {
      this.isShowingWarning = false;
    }, DISMISS_COOLDOWN);
  }

  dispose() {
    this.listener.dispose();
  }
}
