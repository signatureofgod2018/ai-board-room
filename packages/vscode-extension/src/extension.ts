import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("boardroom.startCapture", () => {
      vscode.window.showInformationMessage("Board Room: startCapture — not yet implemented");
    }),
    vscode.commands.registerCommand("boardroom.recordCheckpoint", () => {
      vscode.window.showInformationMessage("Board Room: recordCheckpoint — not yet implemented");
    })
  );
}

export function deactivate(): void {}
