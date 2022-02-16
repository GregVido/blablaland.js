# Blablaland.js

Un retro Open Source développé par GregVido v0.0.3 !

## Installation

Pour utiliser se rétro, vous allez avoir besoin de télécharger nodejs (https://nodejs.org/en/).
Une fois télécharger, executez-le et installez-le.
Créez un dossier, n'importe ou sur votre ordinateur, que vous nommerez 'blablaland.js' pour cet exemple, nous allons en créer un sur le bureau.
Ouvrez l'invite de commande (windows + r > cmd), et entrez la commande
```
cd Desktop\blablaland.js
```
Ensuite, nous allons démarrer le serveur, en effectuant la commande 
```
npm start
```
Enjoy ! Vous pouvez désormer accéder à l'émulateur en allant sur http://localhost =) 

## NEWS v0.0.4

    - Ajoût d'un paramètre "ip" dans config.json qui faut renseigner par l'ip du serveur.
    - Réparation de nombreux bug

## NEWS v0.0.3

    - Ajoût d'un client pour activer flash player
    - Ajoût de nouvelle option au config.json

## NEWS v0.0.2

    - Ajoût du respawn
    - Ajoût du tp à la bonne position (par mémoire donc pas sûr à 100% ¯\_(ツ)_/¯)
    - Ajoût du dodo
    - Ajoût d'un fichier config.json pour configuer quelques paramètre de votre serveur.
    - Ajoût d'un système de mise à jour, qui vérifie la version de votre émulateur.
    - Les bobombes tuent les joueurs
    - Map protégé contre les bobombes
    - Téléportation entre planète impossible
    - Fusé de la base1 fonctionnel
    - Protection basique des mods activé

## Config.json
Le config.json est un petit fichier qui permettra de paramétrer votre serveur.
Il se trouve dans le dossier Server, voici le fonctionnement:

```json
{
    "allowTouriste":"true", 
    "msgErrorTouriste":"Les touristes ont été bloqué.",
    "showPacketsType":"true",
    "allowEditSkinId": "true",
    "allowEditSkinColor": "true"
}
```
À noter que pour désactiver une règle, vous avez juste à remplacer "true" par "false".

## Client

Le client est un outil pour se connecter au serveur, si vous décidé d'en créer un, vérifiez que votre serveur est bien publique, et envoyé le nom de domaine/ip au personnes avec qui vous voulez jouer. <br />
La personne aura juste à renseigner le nom de domaine/ip dans le client (host) pour se connecter au serveur.

<b>À Noter qu'il faut installer flash player 11 pour internet explorer, vous pouvez le faire en <a href="http://www.oldversion.fr/windows/macromedia-flash-player-11-3-300-257-ie">cliquant ici</a>.</b>