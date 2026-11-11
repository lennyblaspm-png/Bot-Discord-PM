# PoliceMunicipale-RH

Bot Discord Premium de gestion RH pour la Police Municipale.

## Caractéristiques

- Système de ticket complet avec 12 services
- Configuration entièrement depuis Discord
- Transcriptions HTML automatiques
- Système d'évaluation
- Statistiques et dashboard
- Relances automatiques
- Anti double ticket et anti spam

## Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/policemunicipale-rh.git

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer le fichier .env avec vos informations

# Démarrer le bot
npm start
```

## Configuration

Éditez le fichier `.env` :

```
DISCORD_TOKEN=votre_token
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
```

## Commandes

| Commande | Description |
|----------|-------------|
| `/rhconfig` | Configuration du système |
| `/rhdeploy` | Déployer le panneau de ticket |
| `/rc` | Déployer le panneau recrutement / direction |
| `/stats` | Statistiques du serveur |
| `/dashboard` | Tableau de bord RH |
| `/search` | Rechercher des tickets |
| `/panel` | Afficher le panneau |
| `/service` | Gérer les services |
| `/help` | Afficher l'aide |
| `/reopen` | Rouvrir un ticket |
| `/rename` | Renommer un ticket |
| `/priority` | Changer la priorité |
| `/add` | Ajouter un membre |
| `/remove` | Retirer un membre |

Le panneau `/rc` est déployé dans le salon configuré par le bot. Les absences déclarées utilisent des dates au format JJ/MM/AAAA, attribuent automatiquement le rôle absent et le retirent après la date de fin (incluse). La pointeuse envoie un rappel toutes les deux heures dans le salon où `/service` a été utilisé ; les pointages actifs sont conservés au redémarrage.

## Services

1. Directeur
2. Directeur Adjoint
3. Chef de Police
4. Chef de Service Première Classe
5. Chef de Service Seconde Classe
6. BMU
7. GSI
8. Brigade VTT
9. Suggestions Police Municipale
10. Rapport
11. Plainte
12. Démission

## Structure

```
policemunicipale-rh/
├── commands/           # Slash commands
├── events/             # Événements Discord
├── handlers/           # Gestionnaires
├── buttons/            # Boutons interactifs
├── selectMenus/        # Menus de sélection
├── modals/             # Modales
├── database/           # Base de données SQLite
├── utils/              # Utilitaires
├── config/             # Configuration
├── transcripts/        # Transcriptions HTML
├── assets/             # Ressources statiques
├── logs/               # Journaux
├── cache/              # Cache
├── models/             # Modèles de données
├── lang/               # Langues
├── index.js            # Point d'entrée
├── package.json        # Dépendances
└── .env.example        # Variables d'environnement
```

## Licence

MIT
