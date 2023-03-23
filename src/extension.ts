// A lot of the code used to make this extension is from the following repos:
// https://github.com/phindle/error-lens/blob/master/src/extension.ts
// https://github.com/microsoft/vscode-extension-samples/tree/main/webview-sample
// https://github.com/microsoft/vscode-extension-samples/tree/main/webview-view-sample
// https://code.visualstudio.com/api/extension-guides/webview
// and more that I can't find anymore

"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log("Extension activated");

  const provider = new CustomSidebarViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CustomSidebarViewProvider.viewType,
      provider
    )
  );

  let _statusBarItem: vscode.StatusBarItem;
  let errorLensEnabled: boolean = true;

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // console.log('Visual Studio Code Extension "errorlens" is now active');

  // Commands are defined in the package.json file
  let disposableEnableErrorLens = vscode.commands.registerCommand(
    "ErrorLens.enable",
    () => {
      errorLensEnabled = true;

      const activeTextEditor: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;
      if (activeTextEditor) {
        updateDecorationsForUri(activeTextEditor.document.uri);
      }
    }
  );

  context.subscriptions.push(disposableEnableErrorLens);

  let disposableDisableErrorLens = vscode.commands.registerCommand(
    "ErrorLens.disable",
    () => {
      errorLensEnabled = false;

      const activeTextEditor: vscode.TextEditor | undefined =
        vscode.window.activeTextEditor;
      if (activeTextEditor) {
        updateDecorationsForUri(activeTextEditor.document.uri);
      }
    }
  );

  context.subscriptions.push(disposableDisableErrorLens);

  vscode.languages.onDidChangeDiagnostics(
    (diagnosticChangeEvent) => {
      onChangedDiagnostics(diagnosticChangeEvent);
    },
    null,
    context.subscriptions
  );

  // Note: URIs for onDidOpenTextDocument() can contain schemes other than file:// (such as git://)
  vscode.workspace.onDidOpenTextDocument(
    (textDocument) => {
      updateDecorationsForUri(textDocument.uri);
    },
    null,
    context.subscriptions
  );

  // Update on editor switch.
  vscode.window.onDidChangeActiveTextEditor(
    (textEditor) => {
      if (textEditor === undefined) {
        return;
      }
      updateDecorationsForUri(textEditor.document.uri);
    },
    null,
    context.subscriptions
  );

  function onChangedDiagnostics(
    diagnosticChangeEvent: vscode.DiagnosticChangeEvent
  ) {
    if (!vscode.window) {
      return;
    }

    const activeTextEditor: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    // Many URIs can change - we only need to decorate the active text editor
    for (const uri of diagnosticChangeEvent.uris) {
      // Only update decorations for the active text editor.
      if (uri.fsPath === activeTextEditor.document.uri.fsPath) {
        updateDecorationsForUri(uri);
        break;
      }
    }
  }

  function updateDecorationsForUri(uriToDecorate: vscode.Uri) {
    if (!uriToDecorate) {
      return;
    }

    // Only process "file://" URIs.
    if (uriToDecorate.scheme !== "file") {
      return;
    }

    if (!vscode.window) {
      return;
    }

    const activeTextEditor: vscode.TextEditor | undefined =
      vscode.window.activeTextEditor;
    if (!activeTextEditor) {
      return;
    }

    if (!activeTextEditor.document.uri.fsPath) {
      return;
    }

    let numErrors = 0;
    let numWarnings = 0;

    if (errorLensEnabled) {
      let aggregatedDiagnostics: any = {};
      let diagnostic: vscode.Diagnostic;

      // Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
      // a list of objects, grouping together diagnostics which occur on a single line.
      for (diagnostic of vscode.languages.getDiagnostics(uriToDecorate)) {
        let key = "line" + diagnostic.range.start.line;

        if (aggregatedDiagnostics[key]) {
          // Already added an object for this key, so augment the arrayDiagnostics[] array.
          aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
        } else {
          // Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
          aggregatedDiagnostics[key] = {
            line: diagnostic.range.start.line,
            arrayDiagnostics: [diagnostic],
          };
        }

        switch (diagnostic.severity) {
          case 0:
            numErrors += 1;
            break;

          case 1:
            numWarnings += 1;
            break;

          // Ignore other severities.
        }
      }
    }
  }
}

class CustomSidebarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "in-your-face.openview";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext<unknown>,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    // default webview will show doom face 0
    webviewView.webview.html = this.getHtmlContent0(webviewView.webview);

    // This is called every second is decides which doom face to show in the webview
    setInterval(() => {
      let errors = getNumErrors();
      if (errors === 0) {
        webviewView.webview.html = this.getHtmlContent0(webviewView.webview);
      } else if (errors < 2) {
        webviewView.webview.html = this.getHtmlContent1(webviewView.webview);
      } else if (errors < 5) {
        webviewView.webview.html = this.getHtmlContent2(webviewView.webview);
      } else if (errors < 8) {
        webviewView.webview.html = this.getHtmlContent3(webviewView.webview);
      } else if (errors < 10) {
        webviewView.webview.html = this.getHtmlContent4(webviewView.webview);
      } else if (errors < 13) {
        webviewView.webview.html = this.getHtmlContent5(webviewView.webview);
      } else if (errors < 16) {
        webviewView.webview.html = this.getHtmlContent6(webviewView.webview);
      } else if (errors < 20) {
        webviewView.webview.html = this.getHtmlContent7(webviewView.webview);
      } else {
        webviewView.webview.html = this.getHtmlContent7(webviewView.webview);
      }
    }, 1000);
  }

  // This is doom face 0
  private getHtmlContent0(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face0 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible0.png")
    );

    return getHtml(face0);
  }

  // This is doom face 1
  private getHtmlContent1(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face1 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible1.png")
    );

    return getHtml(face1);
  }

  // This is doom face 2
  private getHtmlContent2(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face2 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible2.png")
    );

    return getHtml(face2);
  }

  // This is doom face 3
  private getHtmlContent3(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face3 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible3.png")
    );

    return getHtml(face3);
  }

  // This is doom face 4
  private getHtmlContent4(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face4 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible4.png")
    );

    return getHtml(face4);
  }

  // This is doom face 5
  private getHtmlContent5(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face5 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible5.png")
    );

    return getHtml(face5);
  }

  // This is doom face 6
  private getHtmlContent6(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face6 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible6.png")
    );

    return getHtml(face6);
  }

  // This is doom face 7
  private getHtmlContent7(webview: vscode.Webview): string {
    const stylesheetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "main.css")
    );

    const face7 = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "incredible7.png")
    );

    return getHtml(face7);
  }
}

function getHtml(doomFace: any) {
  return `
    <!DOCTYPE html>
			<html lang="en">
			<head>

			</head>

			<body>
			<section class="wrapper">
      <img class="doomFaces" src="${doomFace}" alt="" >
      <h1 id="errorNum">${getNumErrors() + " errors"}</h1>
			</section>
      </body>

		</html>
  `;
}

// function to get the number of errors in the open file
function getNumErrors(): number {
  const activeTextEditor: vscode.TextEditor | undefined =
    vscode.window.activeTextEditor;
  if (!activeTextEditor) {
    return 0;
  }
  const document: vscode.TextDocument = activeTextEditor.document;

  let numErrors = 0;
  let numWarnings = 0;

  let aggregatedDiagnostics: any = {};
  let diagnostic: vscode.Diagnostic;

  // Iterate over each diagnostic that VS Code has reported for this file. For each one, add to
  // a list of objects, grouping together diagnostics which occur on a single line.
  for (diagnostic of vscode.languages.getDiagnostics(document.uri)) {
    let key = "line" + diagnostic.range.start.line;

    if (aggregatedDiagnostics[key]) {
      // Already added an object for this key, so augment the arrayDiagnostics[] array.
      aggregatedDiagnostics[key].arrayDiagnostics.push(diagnostic);
    } else {
      // Create a new object for this key, specifying the line: and a arrayDiagnostics[] array
      aggregatedDiagnostics[key] = {
        line: diagnostic.range.start.line,
        arrayDiagnostics: [diagnostic],
      };
    }

    switch (diagnostic.severity) {
      case 0:
        numErrors += 1;
        break;

      case 1:
        numWarnings += 1;
        break;

      // Ignore other severities.
    }
  }

  return numErrors;
}

// this method is called when your extension is deactivated
export function deactivate() {}
