export function calculateCognitiveComplexity(text: string): number {
    let score = 0;
    let nestingLevel = 0;
    const lines = text.split('\n');

    for (let line of lines) {
        line = line.trim();

        // Ignore blank lines and simple single-line comments
        if (line.startsWith('//') || line === '') { continue; }

        // --- Rule 2 & Rule 3 from the paper: Breaks in Linear Flow & Nesting Penalty ---
        // For each of these control structures, we add +1 for breaking the top-to-bottom 
        // reading flow (Rule 2), plus the current nesting level (Rule 3).

        if (line.match(/\bif\s*\(/)) { 
            score += 1; 
            score += nestingLevel; 
        }
        if (line.match(/\bfor\s*\(/)) { score += 1 + nestingLevel; }
        if (line.match(/\bwhile\s*\(/)) { score += 1 + nestingLevel; }
        if (line.match(/\bcatch\s*\(/)) { score += 1 + nestingLevel; }
        if (line.match(/\bswitch\s*\(/)) { score += 1 + nestingLevel; }
        if (line.match(/\belse\b/) && !line.match(/\belse if\b/)) { score += 1; }

        if (line.includes('{')) { nestingLevel += 1; }
        if (line.includes('}')) { nestingLevel = Math.max(0, nestingLevel - 1); }
    }
    
    return score;
}