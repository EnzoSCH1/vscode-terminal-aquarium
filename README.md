# Terminal Pixel Aquarium

Une petite scène d’aquarium animée en pixel art, affichée en arrière-plan du panneau inférieur de Visual Studio Code.

## Fonctionnalités

- Poissons, bulles, plantes, rochers, crevettes et crabes animés.
- Personnalisation du décor : choisissez la couleur du sol et ajoutez des éléments à l’aquarium.
- Décor enregistré localement dans les données du navigateur de VS Code.
- Raccourci pour nourrir les poissons.

## Installation

Installez **Terminal Pixel Aquarium** depuis le Marketplace de VS Code, ou depuis un fichier `.vsix` avec **Extensions : Installer à partir de VSIX…**.

Après l’installation, acceptez la proposition d’activation, ou ouvrez la palette de commandes (`Ctrl+Shift+P` / `Cmd+Shift+P`) et exécutez :

**Aquarium Terminal : Activer / Mettre à jour le fond**

Fermez puis relancez complètement VS Code si l’extension vous le demande. Vous pouvez aussi choisir **Recharger la fenêtre** dans la notification.

## Utilisation

Dans le panneau inférieur, ouvrez le menu `⋯` de l’aquarium pour afficher les options :

- Choisissez la couleur du sol : noir, blanc ou jaune.
- Sélectionnez un outil (poisson, plante, caillou ou animal de fond), puis cliquez dans l’aquarium pour ajouter un élément.
- Choisissez **⌨️ Normal** pour ne plus ajouter d’éléments au clic.
- Appuyez sur `Entrée` pour nourrir les poissons.

Pour désactiver l’aquarium, ouvrez la palette de commandes et exécutez **Aquarium Terminal : Désactiver le fond**. La fenêtre VS Code sera rechargée.

## Avertissement

Pour afficher l’animation, l’extension modifie le fichier HTML du Workbench dans le dossier d’installation de VS Code et retire sa balise Content Security Policy. Cette modification peut être écrasée par une mise à jour de VS Code et réduit les protections de sécurité du Workbench pendant que l’aquarium est activé. N’utilisez l’extension que si vous comprenez et acceptez ces conséquences.

La commande de désactivation retire l’injection de l’aquarium, mais ne restaure pas la balise Content Security Policy retirée à l’activation. Pour rétablir les fichiers originaux de VS Code, réparez ou réinstallez VS Code après la désactivation.

## Licence

Distribué sous licence MIT. Consultez le fichier [LICENSE](LICENSE).
