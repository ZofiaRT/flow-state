## Testing the Extension Locally Without Installing It

### 1. Install Dependencies
Open this project folder in VS Code, open the terminal (`Ctrl+~` or `Cmd+~`), and run:

```bash
npm install
```
### 2. Run the Extension
We use VS Code's built-in debugger to test the extension locally without fully installing it.

1. Press F5 on your keyboard.

2. A new VS Code window will pop up. The title bar will say [Extension Development Host]. This is your safe testing environment.

### 3. Test the Command
In the new Extension Development Host window:

1. Open the Command Palette by pressing Ctrl+Shift+P (Windows/Linux) or Cmd+Shift+P (Mac).

2. Type: Flow-State: Hello World

3. Hit Enter. You should see a notification pop up in the bottom right corner!

## Troubleshooting Windows Setup Errors
If you are on Windows, you might hit some aggressive security defaults when trying to press F5 for the first time. Here is how to fix the common ones:

**Error 1: "cannot be loaded because running scripts is disabled on this system" or "exit code: 1"**

The Problem: Windows PowerShell blocks npm scripts by default.

The Fix:
1. Open a new Windows PowerShell window as an Administrator (Search in the Start menu -> Right-click -> Run as Administrator).
2. Paste this command and hit Enter:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
3. Type Y to confirm.
4. Restart VS Code completely and try pressing F5 again.

**Error 2: "Invalid problemMatcher reference: $esbuild-watch"**

The Problem: VS Code doesn't know how to read the output of our bundler (esbuild), or your dependencies didn't install.
The Fix:

1. Make sure you actually ran npm install in your terminal!

2. Install the required VS Code helper extension: Go to the Extensions tab (Ctrl+Shift+X) and search for exactly this ID: @id:connor4312.esbuild-problem-matchers. Click install.

3. Try F5 again.






# flow-state README

This is the README for your extension "flow-state". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

You might need the "esbuild Problem Matchers" extension.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
