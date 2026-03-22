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

  private warningInterval: number;
  private tabWarningThreshold: number;

  constructor(statusBar: StatusBar) {
    const config = vscode.workspace.getConfiguration("flowState");

    // Pull configurable values from settings
    this.warningInterval = config.get<number>("warningTabActivityInterval", 30 * 60 * 1000);
    this.tabWarningThreshold = config.get<number>("tabActivityWarningThreshold", 8);

    const enabled = config.get<boolean>("enableInactiveTabWarnings", true);
    if (!enabled) {
        // Either throw or skip creating this instance entirely
        throw new Error("InactiveTabsManager is disabled via settings");
    }
    
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

  private seedTabs() {
    for (const group of vscode.window.tabGroups.all) {
      for (const tab of group.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          this.markActive(tab.input.uri.toString());
        }
      }
    }
  }

  private markActive(uri: string) {
    this.tabLastActive.set(uri, Date.now());
  }

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

  private checkInactiveTabs() {
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