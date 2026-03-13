import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/**
 * Recursively find all files with the given extensions under a directory,
 * skipping node_modules and .git.
 */
function findSourceFiles(dir: string): string[] {
    const results: string[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findSourceFiles(fullPath));
        } else if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Collect all import/require strings from a source file using simple regex.
 * Handles:
 *   import ... from 'pkg'
 *   import('pkg')
 *   require('pkg')
 */
function extractImports(filePath: string): Set<string> {
    const imports = new Set<string>();
    let content: string;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch {
        return imports;
    }

    const patterns = [
        /from\s+['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
            imports.add(match[1]);
        }
    }
    return imports;
}

/**
 * Given an import specifier like 'lodash/merge' or '@types/node', return the
 * top-level package name ('lodash' or '@types/node').
 */
function packageNameFromSpecifier(specifier: string): string {
    if (specifier.startsWith('@')) {
        // scoped: @scope/name[/...]
        const parts = specifier.split('/');
        return parts.slice(0, 2).join('/');
    }
    return specifier.split('/')[0];
}

/**
 * Finds all package.json files under a directory, skipping node_modules and .git.
 */
function findPackageJsonFiles(dir: string): string[] {
    const results: string[] = [];
    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findPackageJsonFiles(fullPath));
        } else if (entry.name === 'package.json') {
            results.push(fullPath);
        }
    }
    return results;
}

interface ZombiePackagesResult {
    packageJsonPath: string;
    zombies: string[];
}

/**
 * Find zombie (unused) packages in a single package.json.
 * Source files are scanned from the same directory as the package.json.
 */
function findZombiesInPackageJson(packageJsonPath: string): ZombiePackagesResult {
    const dir = path.dirname(packageJsonPath);
    let json: Record<string, unknown>;
    try {
        json = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch {
        return { packageJsonPath, zombies: [] };
    }

    const deps = Object.keys({
        ...(json.dependencies as Record<string, string> | undefined ?? {}),
        ...(json.devDependencies as Record<string, string> | undefined ?? {}),
    });

    if (deps.length === 0) {
        return { packageJsonPath, zombies: [] };
    }

    // Collect all imports across source files
    const allImportedPackages = new Set<string>();
    for (const file of findSourceFiles(dir)) {
        for (const specifier of extractImports(file)) {
            allImportedPackages.add(packageNameFromSpecifier(specifier));
        }
    }

    const zombies = deps.filter(dep => !allImportedPackages.has(dep));

    return { packageJsonPath, zombies };
}

/**
 * Main entry point called from the extension command for checking zombie packages.
 */
export async function checkZombiePackages(outputChannel: vscode.OutputChannel): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine('=== Flow-State: Zombie Package Check ===');
    outputChannel.appendLine('');

    if (!workspaceFolders || workspaceFolders.length === 0) {
        outputChannel.appendLine('Error: No workspace folder found.');
        return;
    }

    let totalZombies = 0;

    for (const folder of workspaceFolders) {
        const rootPath = folder.uri.fsPath;
        outputChannel.appendLine(`Scanning: ${rootPath}`);

        const packageJsonFiles = findPackageJsonFiles(rootPath);

        if (packageJsonFiles.length === 0) {
            outputChannel.appendLine('No package.json found.\n');
            continue;
        }

        for (const pkgPath of packageJsonFiles) {
            const { zombies } = findZombiesInPackageJson(pkgPath);
            const relPath = path.relative(rootPath, pkgPath);
            if (zombies.length === 0) {
                outputChannel.appendLine(`${relPath} — no zombie packages`);
            } else {
                outputChannel.appendLine(`${relPath} — ${zombies.length} zombie package(s):`);
                for (const z of zombies) {
                    outputChannel.appendLine(`  - ${z}`);
                }
                totalZombies += zombies.length;
            }
        }
        outputChannel.appendLine('');
    }

    outputChannel.appendLine(`Done. Total zombie packages found: ${totalZombies}`);
}
