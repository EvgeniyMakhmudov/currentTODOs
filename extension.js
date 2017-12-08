const vscode = require('vscode');
var window = vscode.window;
var workspace = vscode.workspace;


window.pattern = new RegExp('TODO\:|FIXME\:', 'g');
DEFAULT_STYLE = {
    color: "#2196f3",
    backgroundColor: "#ffeb3b",
};
styleForRegExp = Object.assign({}, DEFAULT_STYLE, {}, {
    overviewRulerLane: vscode.OverviewRulerLane.Right
});
customDefaultStyle = {};
isCaseSensitive = false;
DEFAULT_KEYWORDS = {
    "TODO:": {
        text: "TODO:",
        color: '#fff',
        backgroundColor: '#ffbd2a',
        overviewRulerColor: 'rgba(255,189,42,0.8)'
    },
    "FIXME:": {
        text: "FIXME:",
        color: '#fff',
        backgroundColor: '#f06292',
        overviewRulerColor: 'rgba(240,98,146,0.8)'
    }
};


function escapeRegExp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}


function getAssembledData(keywords, customDefaultStyle, isCaseSensitive) {
    var result = {}
    keywords.forEach((v) => {
        v = typeof v == 'string' ? { text: v } : v;
        var text = v.text;
        if (!text) return;//NOTE: in case of the text is empty

        if (!isCaseSensitive) {
            text = text.toUpperCase();
        }

        if (text == 'TODO:' || text == 'FIXME:') {
            v = Object.assign({}, DEFAULT_KEYWORDS[text], v);
        }
        result[text] = Object.assign({}, DEFAULT_STYLE, customDefaultStyle, v);
    })

    Object.keys(DEFAULT_KEYWORDS).forEach((v) => {
        if (!result[v]) {
            result[v] = Object.assign({}, DEFAULT_STYLE, customDefaultStyle, DEFAULT_KEYWORDS[v]);
        }
    });

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
    console.log('Update Decorations !');

    var activeEditor = window.activeTextEditor;
    if (!activeEditor || !activeEditor.document) {
        return;
    }

    var text = activeEditor.document.getText();
    var mathes = {}, match;
    while (match = window.pattern.exec(text)) {
        console.log(match);
    
        var startPos = activeEditor.document.positionAt(match.index);
        var endPos = activeEditor.document.positionAt(match.index + match[0].length);
        var decoration = {
            range: new vscode.Range(startPos, endPos)
        };

        var matchedValue = match[0];
        if (mathes[matchedValue]) {
            mathes[matchedValue].push(decoration);
        } else {
            mathes[matchedValue] = [decoration];
        }

        if (keywordsPattern.join('').trim() && !decorationTypes[matchedValue]) {
            decorationTypes[matchedValue] = window.createTextEditorDecorationType(styleForRegExp);
        }
    }
    
    var sb_msg = "$(checklist)";

    Object.keys(decorationTypes).forEach((v) => {
        var rangeOption = settings.get('enable') && mathes[v] ? mathes[v] : [];
        var decorationType = decorationTypes[v];
        activeEditor.setDecorations(decorationType, rangeOption);

        if (mathes[v]) {
            sb_msg = sb_msg + " " + v + mathes[v].length;
        }
    })

    window.statusBarItem.text = sb_msg;
    window.statusBarItem.show();
    console.log('End');
}


function init(settings) {
    keywordsPattern = settings.get('keywords');

    if (!window.statusBarItem) {
        window.statusBarItem = createStatusBarItem();
    }
    // if (!window.outputChannel) {
    //     window.outputChannel = window.createOutputChannel('TodoHighlight');
    // }

    decorationTypes = {};

    assembledData = getAssembledData(settings.get('keywords'), customDefaultStyle, isCaseSensitive);
    Object.keys(assembledData).forEach((v) => {
        var mergedStyle = Object.assign({}, {
            overviewRulerLane: vscode.OverviewRulerLane.Right
        }, assembledData[v]);

        if (!mergedStyle.overviewRulerColor) {
            // use backgroundColor as the default overviewRulerColor if not specified by the user setting
            mergedStyle.overviewRulerColor = mergedStyle.backgroundColor;
        }

        decorationTypes[v] = window.createTextEditorDecorationType(mergedStyle);
    });

    pattern = Object.keys(assembledData).map((v) => {
        return escapeRegExp(v);
    }).join('|');

    pattern = new RegExp(pattern, 'gi');
    if (isCaseSensitive) {
        pattern = new RegExp(pattern, 'g');
    }

}

function activate(context) {
    console.log('Extension "currenttodos" activated!');
    settings = workspace.getConfiguration('currenttodos');

    init(settings);
    
    let disposable = vscode.commands.registerCommand('currenttodos.refresh', function () {
        updateDecorations();
    });

    context.subscriptions.push(disposable);

    workspace.onDidChangeConfiguration(function () {
        settings = workspace.getConfiguration('currenttodos');

        if (!settings.get('enable')) return;

        init(settings);
        updateDecorations();
    }, null, context.subscriptions);

    window.onDidChangeActiveTextEditor(updateDecorations);
}
exports.activate = activate;

function deactivate() {
}
exports.deactivate = deactivate;