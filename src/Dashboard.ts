import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ActivityTracker } from './features/ActivityTracker';
import { getNonce } from './utils';

const REFRESH_INTERVAL_MS = 1000; // Refrehs interval for the dashboard metrics

export class Dashboard {
    private static currentPanel: Dashboard | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];
    private updateInterval: NodeJS.Timeout | undefined;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, activityTracker: ActivityTracker) {
        this.panel = panel;
        this.panel.webview.html = this.buildHtml(extensionUri);
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.updateInterval = setInterval(() => this.postData(activityTracker), REFRESH_INTERVAL_MS);
    }

    public static show(
        extensionUri: vscode.Uri,
        activityTracker: ActivityTracker
    ) {
        if (Dashboard.currentPanel) {
            Dashboard.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'dashboard',
            'Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );
        panel.iconPath = new vscode.ThemeIcon('pulse');

        Dashboard.currentPanel = new Dashboard(panel, extensionUri, activityTracker);
    }

    public postData(activityTracker: ActivityTracker) {
        const config = vscode.workspace.getConfiguration('flow-state');

        const addDeleteRatio = activityTracker.getAddDeleteRatio();
        const ratioThreshold = config.get<number>('addDeleteRatioThreshold', 0.5);
        const addDeleteStatus =
            activityTracker.charactersDeleted > 100 && addDeleteRatio < ratioThreshold
                ? 'warning' : 'good';

        const timeSinceWriteMs = activityTracker.getTimeSinceLastWriteMs();
        const readWriteThresholdMs = config.get<number>('readWriteTimeThresholdSeconds', 120) * 1000;
        const readWriteStatus =
            activityTracker.isScrolling && timeSinceWriteMs > readWriteThresholdMs
                ? 'warning' : 'good';

        const overallStatus =
            addDeleteStatus === 'warning' ||
                readWriteStatus === 'warning'
                ? 'warning' : 'good';

        this.panel.webview.postMessage({
            overallStatus,
            charsAdded: activityTracker.charactersAdded,
            charsDeleted: activityTracker.charactersDeleted,
            addDeleteRatio: isFinite(addDeleteRatio) ? addDeleteRatio.toFixed(2) : '∞',
            addDeleteStatus,
            timeSinceWriteSec: Math.round(timeSinceWriteMs / 1000),
            readWriteThresholdSec: readWriteThresholdMs / 1000,
            readWriteStatus,
        });
    }

    private buildHtml(extensionUri: vscode.Uri): string {
        const webview = this.panel.webview;
        const mediaPath = vscode.Uri.joinPath(extensionUri, 'media');

        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'dashboard.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, 'dashboard.js'));
        const nonce = getNonce(); // Injected into CSP to prevent malicious code injections

        const htmlPath = path.join(extensionUri.fsPath, 'media', 'dashboard.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        html = html
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{nonce}}/g, nonce)
            .replace(/{{styleUri}}/g, styleUri.toString())
            .replace(/{{scriptUri}}/g, scriptUri.toString());

        return html;
    }

    public dispose() {
        Dashboard.currentPanel = undefined;
        clearInterval(this.updateInterval);
        this.panel.dispose();
        for (const d of this.disposables) {
            d.dispose();
        }
    }
}
