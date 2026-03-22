const vscode = acquireVsCodeApi();

window.addEventListener('message', (event) => {
    const data = event.data;
    render(data);
});

/**
 * @param {{
 *   overallStatus: string,
 *   currentFile: string,
 *   complexityScore: number,
 *   complexityThreshold: number,
 *   complexityStatus: string,
 *   charsAdded: number,
 *   charsDeleted: number,
 *   addDeleteRatio: string,
 *   addDeleteStatus: string,
 *   timeSinceWriteSec: number,
 *   readWriteThresholdSec: number,
 *   readWriteStatus: string,
 *   pastedChars: number,
 *   insertionThreshold: number,
 *   insertionStatus: string,
 * }} data
 */
function render(data) {
    // Overall badge
    const badge = document.getElementById('overall-badge');
    badge.className = `badge ${data.overallStatus}`;
    badge.textContent = data.overallStatus === 'warning' ? '⚠ Warning' : '✓ Optimal';

    // Active warning banner
    const banner = document.getElementById('active-warning');
    if (data.activeWarning) {
        banner.textContent = `⚠ ${data.activeWarning}`;
        banner.className = 'warning-banner';
    } else {
        banner.textContent = '✓ No active alerts';
        banner.className = 'warning-banner clear';
    }

    // Cards
    setCard('complexity', data.complexityStatus,
        String(data.complexityScore),
        `Threshold: ${data.complexityThreshold}`
    );

    setCard('readwrite', data.readWriteStatus,
        `${data.timeSinceWriteSec}s`,
        `Alert threshold: ${data.readWriteThresholdSec}s of heavy reading`
    );


}

/**
 * @param {string} id
 * @param {string} status
 * @param {string} value
 * @param {string} detail
 */
function setCard(id, status, value, detail) {
    const card = document.getElementById(`card-${id}`);
    card.className = `card ${status}`;
    card.querySelector('.card-icon').textContent = status === 'warning' ? '⚠' : '✓';
    document.getElementById(`val-${id}`).textContent = value;
    document.getElementById(`detail-${id}`).textContent = detail;
}
