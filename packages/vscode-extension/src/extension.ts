import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("basilica.startCapture", () => {
      vscode.window.showInformationMessage("Basilica: startCapture — not yet implemented");
    }),
    vscode.commands.registerCommand("basilica.recordCheckpoint", () => {
      vscode.window.showInformationMessage("Basilica: recordCheckpoint — not yet implemented");
    })
  );
}

export function deactivate(): void {}
