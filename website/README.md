# 🛡️ Site Web Police Municipale de Paris

## Installation

```bash
cd website
npm install
```

## Configuration

Créez un fichier `.env` avec vos informations Discord OAuth2:

```
CLIENT_ID=votre_client_id
CLIENT_SECRET=votre_client_secret
GUILD_ID=1489720986331906068
CALLBACK_URL=http://localhost:3000/auth/callback
```

## Lancement

```bash
npm start
```

Le site sera disponible sur `http://localhost:3000`

## Fonctionnalités

- 🔐 Connexion via Discord OAuth2
- 📊 Tableau de bord RH
- 🤖 Générateur de PV d'interpellation (IA)
- 📈 Statistiques
- 📋 Gestion des tickets
