import * as vscode from "vscode";
import * as path from "path";

import { StatusBar } from "../StatusBar";

const WINDOW_DURATION = 10 * 60 * 1000; 
const SWITCH_THRESHOLD = 8; 

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
  private configListener: vscode.Disposable;

  private isShowingWarning = false;

  private statusBar: StatusBar;

  private isEnabled: boolean = true;
  private switchThreshold: number = SWITCH_THRESHOLD;
  private windowDuration: number = WINDOW_DURATION;

  /**
   * Calculates the current context switch score based on recent events within the sliding window.
   * @returns current score
   */
  public get currentScore(): number {
    const now = Date.now();
    const recent = this.switchEvents.filter(e => now - e.time < this.windowDuration);
    return recent.reduce((sum, e) => sum + e.weight, 0);
  }

  /**
   * Gets the threshold for triggering a context switch warning.
   * @returns threshold
   */
  public get threshold(): number {
    return this.switchThreshold;
  }

  /**
   * Initializes the context switch manager with the provided status bar.
   * @param statusBar 
   */
  constructor(statusBar: StatusBar) {
    this.statusBar = statusBar;
    this.updateConfig();

    this.listener = vscode.window.onDidChangeActiveTextEditor((editor) =>
      this.handleEditorChange(editor),
    );

    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("flow-state.contextSwitch")) {
        this.updateConfig();
      }
    });
  }

  /**
   * Updates the configuration settings for the context switch manager, including enabling/disabling the feature,
   * adjusting the switch threshold, and setting the duration of the sliding window. This method is called when
   * the relevant configuration changes.
   */
  private updateConfig() {
    const config = vscode.workspace.getConfiguration(
      "flow-state.contextSwitch",
    );
    this.isEnabled = config.get<boolean>("enabled", true);
    this.switchThreshold = config.get<number>("switchThreshold", 8);
    this.windowDuration = config.get<number>("windowDuration", 10 * 60 * 1000);
  }

  /**
   * Handles changes to the active text editor. Detects when the user switches files or folders and records context switch events accordingly.
   * If the accumulated switch score exceeds the threshold, a warning is triggered.
   * @param editor 
   * @returns 
   */
  private handleEditorChange(editor: vscode.TextEditor | undefined) {
    if (!editor) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const folderPath = path.dirname(filePath);

    let weight = 0;

    const fileChanged = this.lastFilePath && filePath !== this.lastFilePath;

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

  /**
   * Records a context switch event with the given weight. It adds the event to the list of recent events and calculates the current switch score.
   * @param weight 
   */
  private async recordSwitch(weight: number) {
    if (!this.isEnabled) {
      return;
    }

    const now = Date.now();

    this.switchEvents.push({ time: now, weight });

    this.switchEvents = this.switchEvents.filter(
      (e) => now - e.time < this.windowDuration,
    );

    const score = this.switchEvents.reduce((sum, e) => sum + e.weight, 0);

    console.log(`[flow-state] switch score: ${score}`);

    if (
      score > this.switchThreshold &&
      !this.isShowingWarning &&
      now > this.cooldownExpiresAt
    ) {
      this.showWarning();
    }
  }
  
  /**
   * Displays a warning in the status bar when frequent context switching is detected. This method sets a cooldown period during which no new warnings will be shown,
   * even if the user continues to switch contexts frequently. The warning encourages the user to focus on one task to reduce cognitive load.
   */
  private async showWarning() {
    this.isShowingWarning = true;

    const now = Date.now();
    this.cooldownExpiresAt = now + DISMISS_COOLDOWN;

    // Send warning to status bar only
    const message =
      "Frequent context switching detected! Try focusing on one task.";
    this.statusBar.showTemporaryWarning(message);

    this.switchEvents = [];
    console.log(
      "[flow-state] Context switch warning triggered (status bar only)",
    );

    setTimeout(() => {
      this.isShowingWarning = false;
    }, DISMISS_COOLDOWN);
  }

  dispose() {
    this.listener.dispose();
    this.configListener.dispose();
  }
}
