const vscode = require('vscode');
var window = vscode.window;
var workspace = vscode.workspace;


function escapeRegExp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


function getAssembledData(keywords, isCaseSensitive) {
    var result = {}
    keywords.forEach((v) => {
        let text = v.text;
        if (!text) return;//NOTE: in case of the text is empty

        if (!isCaseSensitive) {
            text = text.toUpperCase();
        }

        result[text] = v;
    })

    return result;
}

function createStatusBarItem() {
    var statusBarItem = window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = "$(checklist): 0";
    statusBarItem.tooltip = 'List current annotations';
    // statusBarItem.command = 'currenttodos.showOutputChannel';
    return statusBarItem;
}

function updateDecorations() {
    var activeEditor = window.activeTextEditor;
    if (!activeEditor || !activeEditor.document) {
        window.statusBarItem.text = "$(checklist): 0";
        window.statusBarItem.show();
        return;
    }

    var text = activeEditor.document.getText();
    var matches = {}, match;
    while (match = window.pattern.exec(text)) {
        var startPos = activeEditor.document.positionAt(match.index);
        var endPos = activeEditor.document.positionAt(match.index + match[0].length);
        var decoration = {
            range: new vscode.Range(startPos, endPos)
        };

        var matchedValue = match[0];
        if (matches[matchedValue]) {
            matches[matchedValue].push(decoration);
        } else {
            matches[matchedValue] = [decoration];
        }
    }
    
    var sb_msg = "";

    Object.keys(window.decorationTypes).forEach((v) => {
        var rangeOption = window.settings.get('enable') && matches[v] ? matches[v] : [];
        var decorationType = window.decorationTypes[v];
        activeEditor.setDecorations(decorationType, rangeOption);

        if (matches[v]) {
            sb_msg = sb_msg + " " + v + matches[v].length;
        }
    })
    if (sb_msg) {
        window.statusBarItem.text = "$(checklist)" + sb_msg;
    }
    else {
        window.statusBarItem.text = "$(checklist): 0";
    }
    window.statusBarItem.show();
}


function init(settings) {
    let isCaseSensitive = settings.get('isCaseSensitive');

    if (!window.statusBarItem) {
        window.statusBarItem = createStatusBarItem();
    }
    // if (!window.outputChannel) {
    //     window.outputChannel = window.createOutputChannel('TodoHighlight');
    // }

    window.decorationTypes = {};

    let assembledData = getAssembledData(settings.get('keywords'), isCaseSensitive);
    Object.keys(assembledData).forEach((v) => {
        var mergedStyle = Object.assign({}, {
            overviewRulerLane: vscode.OverviewRulerLane.Right
        }, assembledData[v]);

        if (!mergedStyle.overviewRulerColor) {
            // use backgroundColor as the default overviewRulerColor if not specified by the user setting
            mergedStyle.overviewRulerColor = mergedStyle.backgroundColor;
        }

        window.decorationTypes[v] = window.createTextEditorDecorationType(mergedStyle);
    });

   let pattern = Object.keys(assembledData).map((v) => {
        return escapeRegExp(v);
    }).join('|');

    if (isCaseSensitive) {
        window.pattern = new RegExp(pattern, 'g');
    } else {
        window.pattern = new RegExp(pattern, 'gi');
    }

}

function activate(context) {
    console.log('Extension "currenttodos" activated!');
    window.settings = workspace.getConfiguration('currenttodos');

    init(window.settings);
    
    let disposable = vscode.commands.registerCommand('currenttodos.refresh', updateDecorations);

    context.subscriptions.push(disposable);

    workspace.onDidChangeConfiguration(function () {
        window.settings = workspace.getConfiguration('currenttodos');

        if (!window.settings.get('enable')) return;

        init(window.settings);
        updateDecorations();
    }, null, context.subscriptions);

    window.onDidChangeActiveTextEditor(updateDecorations);
    workspace.onDidSaveTextDocument(updateDecorations);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;