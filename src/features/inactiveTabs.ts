import * as vscode from "vscode";
import * as path from "path";

import { StatusBar } from "../StatusBar";

const CHECK_INTERVAL = 60 * 1000; // Check for inactive tabs every 1 min
const TAB_INACTIVE_THRESHOLD = 30 * 60 * 1000; // A tab that is not touched for 30 minutes is inactive 30 * 60 * 1000

/**
 * Monitors all open text editor tabs and periodically warns
 * the user when too many tabs are inactive for an extended period. It tracks
 * the last-active timestamp for every tab, runs a background interval to detect
 * inactivity, and notifies the user.
 */
export class InactiveTabsManager implements vscode.Disposable {
  private tabLastActive = new Map<string, number>();
  private disposables: vscode.Disposable[] = [];
  private interval: NodeJS.Timeout;
  private statusBar: StatusBar;

  private lastWarningTime = 0;

  private isEnabled: boolean = true;
  private warningInterval: number;
  private tabWarningThreshold: number;
  
  /**
   * Initializes the inactive tabs manager with the provided status bar.
   * @param statusBar 
   */
  constructor(statusBar: StatusBar) {
    const config = vscode.workspace.getConfiguration("flow-state");

    // Pull configurable values from settings
    this.isEnabled = config.get<boolean>("enableInactiveTabWarnings", true);
    this.warningInterval = config.get<number>("warningTabActivityInterval", 30 * 60 * 1000);
    this.tabWarningThreshold = config.get<number>("tabActivityWarningThreshold", 8);
    
    this.statusBar = statusBar;
    // Record all tabs that are already open when the manager is first created
    this.seedTabs();

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
          this.markActive(editor.document.uri.toString());
        }
      }),

      vscode.window.tabGroups.onDidChangeTabs((event) => {
        for (const tab of event.closed) {
          if (tab.input instanceof vscode.TabInputText) {
            this.tabLastActive.delete(tab.input.uri.toString());
          }
        }
      }),
    );

    this.interval = setInterval(() => this.checkInactiveTabs(), CHECK_INTERVAL);
  }

  /**
   * Seeds the initial state of the tab activity tracker by marking all currently open text editor tabs as active.
   * This ensures that the manager has a baseline for tracking inactivity from the moment it is initialized,
   * rather than treating all existing tabs as inactive until they are interacted with.
   */
  private seedTabs() {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          this.markActive(tab.input.uri.toString());
        }
      }
    }
  }

  /**
   * Marks a tab as active by updating its last-active timestamp to the current time. This method is called whenever a tab is interacted with.
   * @param uri 
   */
  private markActive(uri: string) {
    this.tabLastActive.set(uri, Date.now());
  }

  /**
   * Retrieves all tabs that have been inactive for longer than the threshold.
   * @returns 
   */
  private getInactiveTabs(): vscode.Tab[] {
    const now = Date.now();

    return vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .filter((tab) => {
        if (!(tab.input instanceof vscode.TabInputText)) return false;

        const last = this.tabLastActive.get(tab.input.uri.toString());
        return last && now - last > TAB_INACTIVE_THRESHOLD;
      });
  }

  /**
   * Checks for inactive tabs and shows a warning if the number of inactive tabs exceeds the configured threshold.
   * This method is called periodically by a background interval.
   * @returns 
   */
  private checkInactiveTabs() {
    if (!this.isEnabled) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.markActive(editor.document.uri.toString());
    }

    const now = Date.now();

    if (now - this.lastWarningTime < this.warningInterval) {
      return;
    }

    const inactiveTabs = this.getInactiveTabs();

    if (inactiveTabs.length < this.tabWarningThreshold) {
      return;
    }

    this.lastWarningTime = now;

    const message = `${inactiveTabs.length} inactive tabs — click to review`;

    this.statusBar.showTemporaryWarning(message);

    // Make status bar clickable
    this.statusBar.setCommand("flow-state.reviewInactiveTabs");
  }

  /**
   * Shows a quick pick menu to allow the user to select and close inactive tabs.
   * @returns 
   */
  public async showInactiveTabsPicker() {
    const inactiveTabs = this.getInactiveTabs();

    if (!inactiveTabs.length) {
      return;
    }

    const items = inactiveTabs.map((tab) => {
      const uri = (tab.input as vscode.TabInputText).uri;
      const file = path.basename(uri.fsPath);
      const full_path = vscode.workspace.asRelativePath(uri, true);

      return {
        label: `$(file) ${file}`,
        description: full_path,
        tab,
      };
    });

    const picks = await vscode.window.showQuickPick(items, {
      title: "Inactive Tabs",
      canPickMany: true,
      placeHolder: "Select tabs to close",
    });

    if (!picks) { return; };

    const tabsToClose = picks.map((p) => p.tab);
    vscode.window.tabGroups.close(tabsToClose);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    clearInterval(this.interval);
  }
}