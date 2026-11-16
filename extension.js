const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MARKER_START = '<!-- TERMINAL-AQUARIUM-START -->';
const MARKER_END = '<!-- TERMINAL-AQUARIUM-END -->';
const MARKER_RE = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, 'g');
const SCRIPT_NAME = 'aquarium-inject.js';
const BACKUP_SUFFIX = '.aquarium-backup';

// globalState keys
const KEY_ENABLED = 'aquariumEnabled';          // the user wants the aquarium on
const KEY_LEGACY = 'aquariumInstalled';         // same meaning, written by versions <= 1.2
const KEY_DISMISSED = 'aquariumPromptDismissed'; // the user answered "Not now" to the first prompt

function getWorkbenchPath() {
    const appRoot = vscode.env.appRoot;
    const candidates = [
        path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.html'),
        path.join(appRoot, 'out', 'vs', 'code', 'electron-sandbox', 'workbench', 'workbench.esm.html'),
        path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html'),
        path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.html')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function updateChecksum(wbPath) {
    try {
        const appRoot = vscode.env.appRoot;
        const productJsonPath = path.join(appRoot, 'product.json');
        if (!fs.existsSync(productJsonPath)) return;

        const product = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));
        if (!product.checksums) return;

        const fileContent = fs.readFileSync(wbPath);
        const hash = crypto.createHash('sha256').update(fileContent).digest('base64').replace(/=+$/, '');

        const outDir = path.join(appRoot, 'out');
        const relKey = path.relative(outDir, wbPath).split(path.sep).join('/');

        if (product.checksums[relKey] !== undefined) {
            product.checksums[relKey] = hash;
            fs.writeFileSync(productJsonPath, JSON.stringify(product, null, '\t'), 'utf8');
        }
    } catch (e) {
        // product.json is read-only or locked: VS Code will only show its "unsupported" notice
    }
}

function sameFile(a, b) {
    try {
        const sa = fs.statSync(a), sb = fs.statSync(b);
        return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
    } catch (e) {
        return false;
    }
}

/**
 * What is currently installed in VS Code.
 * - 'none'     : no workbench file found
 * - 'missing'  : the aquarium is not in the workbench (never installed, or a VS Code update removed it)
 * - 'outdated' : installed, but with an older aquarium script than this extension ships
 * - 'current'  : installed and up to date
 */
function installState(context) {
    const wbPath = getWorkbenchPath();
    if (!wbPath) return 'none';
    let html;
    try { html = fs.readFileSync(wbPath, 'utf8'); } catch (e) { return 'none'; }
    if (!html.includes(MARKER_START)) return 'missing';
    const src = path.join(context.extensionPath, SCRIPT_NAME);
    const dest = path.join(path.dirname(wbPath), SCRIPT_NAME);
    return sameFile(src, dest) ? 'current' : 'outdated';
}

/** Copies the aquarium script next to workbench.html and adds the <script> tag. Throws on failure. */
function applyPatch(context) {
    const wbPath = getWorkbenchPath();
    if (!wbPath) throw new Error('workbench.html not found');

    const wbDir = path.dirname(wbPath);
    let html = fs.readFileSync(wbPath, 'utf8');

    // Keep a copy of the untouched file once, so "Disable" can put VS Code back exactly as it was.
    const backup = wbPath + BACKUP_SUFFIX;
    if (!html.includes(MARKER_START) && !fs.existsSync(backup)) {
        fs.writeFileSync(backup, html, 'utf8');
    }

    // The script is loaded from a file next to workbench.html (no inline code).
    fs.copyFileSync(path.join(context.extensionPath, SCRIPT_NAME), path.join(wbDir, SCRIPT_NAME));

    html = html.replace(MARKER_RE, '');
    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/gi, '');
    const payload = `${MARKER_START}\n<script src="./${SCRIPT_NAME}"></script>\n${MARKER_END}`;
    html = html.replace('</html>', `${payload}\n</html>`);

    fs.writeFileSync(wbPath, html, 'utf8');
    updateChecksum(wbPath);
}

/** Removes the aquarium. Restores the original workbench.html when a backup exists. Throws on failure. */
function removePatch() {
    const wbPath = getWorkbenchPath();
    if (!wbPath) return;

    const dest = path.join(path.dirname(wbPath), SCRIPT_NAME);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);

    const backup = wbPath + BACKUP_SUFFIX;
    if (fs.existsSync(backup)) {
        fs.copyFileSync(backup, wbPath);
        fs.unlinkSync(backup);
    } else {
        const html = fs.readFileSync(wbPath, 'utf8');
        fs.writeFileSync(wbPath, html.replace(MARKER_RE, ''), 'utf8');
    }
    updateChecksum(wbPath);
}

function isPermissionError(err) {
    return err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EROFS');
}

function showFailure(action, err) {
    if (isPermissionError(err)) {
        vscode.window.showErrorMessage(
            `Terminal Aquarium could not ${action}: VS Code's files are protected on this computer. ` +
            'Close VS Code, start it once as administrator, and run "Terminal Aquarium: Enable / Update Background" again.'
        );
    } else {
        vscode.window.showErrorMessage(`Terminal Aquarium could not ${action}: ${err.message}`);
    }
}

/** Shows a message with a "Reload window" button, and reloads when it is clicked. */
function offerReload(message) {
    vscode.window.showInformationMessage(message, 'Reload window').then(sel => {
        if (sel === 'Reload window') vscode.commands.executeCommand('workbench.action.reloadWindow');
    });
}

function activate(context) {
    const state = context.globalState;
    const wantsAquarium = () => state.get(KEY_ENABLED, state.get(KEY_LEGACY, false));

    const install = (successMessage) => {
        try {
            applyPatch(context);
            state.update(KEY_ENABLED, true);
            offerReload(successMessage);
            return true;
        } catch (err) {
            showFailure('turn on the aquarium', err);
            return false;
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('terminalAquarium.install', () => {
            install('Aquarium is ready! Reload the window to see it.');
        }),
        vscode.commands.registerCommand('terminalAquarium.uninstall', () => {
            try {
                removePatch();
                state.update(KEY_ENABLED, false);
                state.update(KEY_LEGACY, false);
                state.update(KEY_DISMISSED, true);   // do not ask again at the next start
                offerReload('Aquarium removed and VS Code files restored. Reload the window to finish.');
            } catch (err) {
                showFailure('remove the aquarium', err);
            }
        })
    );

    // On startup: keep the aquarium working without asking the user to remember a command.
    const current = installState(context);
    if (current === 'none') return;

    if (wantsAquarium()) {
        // The user turned the aquarium on. Repair it quietly when something changed underneath.
        if (current === 'outdated') {
            install('Terminal Aquarium was updated. Reload the window to see the new version.');
        } else if (current === 'missing') {
            install('VS Code was updated, so the aquarium was put back. Reload the window to see it.');
        }
        return;
    }

    if (current !== 'missing') {
        // Installed by an older version that did not remember the choice: adopt it.
        state.update(KEY_ENABLED, true);
        if (current === 'outdated') install('Terminal Aquarium was updated. Reload the window to see the new version.');
        return;
    }

    // First run: ask once.
    if (state.get(KEY_DISMISSED, false)) return;
    vscode.window.showInformationMessage(
        'Thanks for installing Terminal Pixel Aquarium! Turn on the aquarium behind your terminal? ' +
        'This adds one script to VS Code\'s own files; "Disable Background" restores them.',
        'Turn it on', 'Not now'
    ).then(sel => {
        if (sel === 'Turn it on') {
            install('Aquarium is ready! Reload the window to see it.');
        } else if (sel === 'Not now') {
            state.update(KEY_DISMISSED, true);
            vscode.window.showInformationMessage(
                'No problem. You can turn it on later from the Command Palette: "Terminal Aquarium: Enable / Update Background".'
            );
        }
    });
}

function deactivate() {}

module.exports = { activate, deactivate };
