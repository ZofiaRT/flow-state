# Flow-State

**Flow-State** is a VS Code extension designed to protect developers from burnout. It runs quietly in the background to monitor your coding habits, complexity, and context-switching, warning you before mental fatigue sets in.

## Features

- **Developer Cognitive Load Tracker**: Monitors your current coding session to prevent you from getting overwhelmed. It tracks:
  - **Code Complexity**: Alerts you if the file you are working on crosses a cognitive complexity threshold.
  - **Reading vs. Writing**: Detects if you've been staring at a file for too long without typing.
  - **Deletion Ratios**: Notices heavy code deletion, a common sign of frustration.
  - **Large Insertions**: Warns you if you paste massive chunks of code (like AI-generated blocks) that drastically increase mental load.
- **Reviewer Cognitive Load Tracker**: Burnout happens during code reviews too. Analyze your staged Git files before opening a Pull Request to ensure you aren't overwhelming your reviewers with massive changes.
  - **Code Complexity**: Alerts you if the file you are working on crosses a cognitive complexity threshold.
  - **Zombie Dependencies**: Alerts you if your project contains zombie packages - packages that are contained in `package.json` but are not imported.
  - **Large Changes**: Alerts you if changes in your branch exceed 400 LOC to prevent reviewer overload.
- **Activity & Context Switching**: Tracks how often you bounce between different files to help you maintain deep focus.
- **Status Bar Integration**: Hover over the Flow-State indicator in the bottom right of your VS Code window at any time for a quick health check of your current environment.

## Commands

Flow-State contributes the following commands to the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- `Flow-State: Analyze PR (Reviewer Load)` - Manually trigger an analysis of your staged Git files to check for reviewer fatigue.
- `Flow-State: Check Zombie Packages` - Scan your workspace for unused or "zombie" dependencies.

## Extension Settings

Flow-State is highly customizable. You can tweak the thresholds to perfectly match your workflow in your VS Code Settings (`Ctrl+,` / `Cmd+,` -> search for "Flow-State"):

**Master Switches:**
* `flow-state.enableCognitiveLoadTracker`: Enable or disable the entire Developer Cognitive Load tracker.
* `flow-state.enableReviewerLoadTracking`: Enable or disable tracking for Reviewer Cognitive Load.

**Other Settings:**
* `flow-state.enableCodeComplexity`: Toggle Code Complexity tracking.
* `flow-state.complexityThreshold`: Max allowed cognitive complexity score per file (Default: `15`).
* `flow-state.enableReadWriteTracking`: Toggle the reading-time tracker.
* `flow-state.readWriteTimeThresholdSeconds`: Time without typing before triggering a 'Heavy Reading' warning (Default: `120`).
* `flow-state.enableAddDeleteTracking`: Toggle Add-Delete ratio tracking.
* `flow-state.addDeleteRatioThreshold`: The ratio that triggers a 'Stuck' warning (Default: `0.5`).
* `flow-state.enableLargeInsertionTracking`: Toggle massive text insertion tracking.
* `flow-state.largeInsertionThresholdChars`: The character count that triggers a 'High Review Load' warning (Default: `600`).
* `flow-state.reviewerLocThreshold`: Max number of modified Lines of Code allowed in a PR (Default: `400`).

---

## Contributing & Local Development

Want to work on Flow-State? You can test the extension locally without fully installing it!

### 1. Install Dependencies
Open this project folder in VS Code, open the terminal (`Ctrl+~` or `Cmd+~`), and run:

```bash
npm install
```

### 2. Run the Extension
We use VS Code's built-in debugger to test the extension locally.
1. Press `F5` on your keyboard.
2. A new VS Code window will pop up. The title bar will say `[Extension Development Host]`. This is your safe testing environment.

### 3. Test the Commands
In the new Extension Development Host window:
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Type `Flow-State` to see and run the available commands.

### Troubleshooting Windows Setup Errors
If you are on Windows, you might hit some aggressive security defaults when trying to press `F5` for the first time. Here is how to fix the common ones:

**Error 1: "cannot be loaded because running scripts is disabled on this system" or "exit code: 1"**
* **The Problem:** Windows PowerShell blocks npm scripts by default.
* **The Fix:**
  1. Open a new Windows PowerShell window as an Administrator.
  2. Paste this command and hit Enter: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
  3. Type `Y` to confirm.
  4. Restart VS Code completely and try pressing `F5` again.

**Error 2: "Invalid problemMatcher reference: $esbuild-watch"**
* **The Problem:** VS Code doesn't know how to read the output of our bundler (esbuild), or your dependencies didn't install.
* **The Fix:**
  1. Make sure you actually ran `npm install` in your terminal!
  2. Install the required VS Code helper extension: Go to the Extensions tab (`Ctrl+Shift+X`) and search for `@id:connor4312.esbuild-problem-matchers`. Click install.
  3. Try `F5` again.

