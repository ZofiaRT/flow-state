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

    setCard('contextswitch', data.contextSwitchStatus,
        `${data.contextSwitchScore} / ${data.contextSwitchThreshold}`,
        `Switch score since last alert`
    );

    // Reviewer section
    const reviewer = data.reviewer;
    const reviewerSection = document.getElementById('reviewer-section');
    const reviewerEmpty = document.getElementById('reviewer-empty');

    if (!reviewer.enabled || reviewer.fileCount === 0) {
        reviewerSection.style.display = 'none';
        reviewerEmpty.textContent = reviewer.enabled ? 'Use git add to stage your PR and see reviewer load.' : 'Reviewer tracking is disabled.';
        reviewerEmpty.style.display = '';
        reviewerEmpty.className = 'warning-banner clear';
    } else {
        reviewerSection.style.display = '';
        reviewerEmpty.style.display = 'none';

        const locStatus = reviewer.loc > data.locThreshold ? 'warning' : 'good';
        const complexStatus = reviewer.complexFiles > 0 ? 'warning' : 'good';

        setCard('reviewer-files', 'good', String(reviewer.fileCount), 'staged files');
        setCard('reviewer-loc', locStatus, String(reviewer.loc), `Threshold: ${data.locThreshold} lines`);
        setCard('reviewer-complexity', complexStatus, String(reviewer.complexFiles), `Files above complexity threshold`);

        const zombieBanner = document.getElementById('reviewer-zombie');
        if (reviewer.hasZombieWarning) {
            zombieBanner.textContent = '⚠ Potential zombie packages detected in package.json';
            zombieBanner.className = 'warning-banner';
        } else {
            zombieBanner.textContent = '';
            zombieBanner.className = 'warning-banner clear';
        }
    }

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
