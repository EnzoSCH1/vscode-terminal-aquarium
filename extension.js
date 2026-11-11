const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MARKER_START = '<!-- TERMINAL-AQUARIUM-START -->';
const MARKER_END = '<!-- TERMINAL-AQUARIUM-END -->';

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
        // Ignoré si product.json est verrouillé
    }
}

function activate(context) {
    const installCmd = vscode.commands.registerCommand('terminalAquarium.install', () => {
        const wbPath = getWorkbenchPath();
        if (!wbPath) {
            vscode.window.showErrorMessage("Impossible de trouver workbench.html.");
            return;
        }

        try {
            const wbDir = path.dirname(wbPath);
            const srcScript = path.join(context.extensionPath, 'aquarium-inject.js');
            const destScript = path.join(wbDir, 'aquarium-inject.js');

            // 1. Copie le fichier JS dans le dossier de workbench.html (contourne le blocage CSP inline)
            fs.copyFileSync(srcScript, destScript);

            let html = fs.readFileSync(wbPath, 'utf8');

            // 2. Nettoie un éventuel ancien patch
            const regex = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`, 'g');
            html = html.replace(regex, '');

            // 3. Assouplit la Content-Security-Policy pour autoriser le script local
            html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?>/gi, '');

            // 4. Injecte la balise externe propre
            const payload = `${MARKER_START}\n<script src="./aquarium-inject.js"></script>\n${MARKER_END}`;
            html = html.replace('</html>', `${payload}\n</html>`);

            fs.writeFileSync(wbPath, html, 'utf8');
            updateChecksum(wbPath);

            vscode.window.showInformationMessage(
                "Aquarium installé avec succès ! Ferme et relance complètement VS Code.",
                "Recharger la fenêtre"
            ).then(sel => {
                if (sel === "Recharger la fenêtre") {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Accès refusé (${err.message}). Ferme VS Code et relance-le en tant qu'Administrateur.`);
        }
    });

    const uninstallCmd = vscode.commands.registerCommand('terminalAquarium.uninstall', () => {
        const wbPath = getWorkbenchPath();
        if (!wbPath) return;

        try {
            const wbDir = path.dirname(wbPath);
            const destScript = path.join(wbDir, 'aquarium-inject.js');
            if (fs.existsSync(destScript)) fs.unlinkSync(destScript);

            let html = fs.readFileSync(wbPath, 'utf8');
            const regex = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`, 'g');
            html = html.replace(regex, '');
            fs.writeFileSync(wbPath, html, 'utf8');
            updateChecksum(wbPath);

            vscode.window.showInformationMessage("Aquarium désinstallé.", "Recharger").then(() => {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            });
        } catch (err) {
            vscode.window.showErrorMessage(`Erreur : ${err.message}`);
        }
    });

    context.subscriptions.push(installCmd, uninstallCmd);

    // Propose automatiquement d'activer l'aquarium dès l'installation de l'extension
    const isInstalled = context.globalState.get('aquariumInstalled', false);
    if (!isInstalled) {
        vscode.window.showInformationMessage(
            "Merci d'avoir installé Terminal Pixel Aquarium ! Voulez-vous activer l'aquarium en fond du terminal ?",
            "Activer maintenant"
        ).then(sel => {
            if (sel === "Activer maintenant") {
                context.globalState.update('aquariumInstalled', true);
                vscode.commands.executeCommand('terminalAquarium.install');
            }
        });
    }
}

function deactivate() {}

module.exports = { activate, deactivate }