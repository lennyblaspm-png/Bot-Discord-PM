const express = require('express');
const router = express.Router();

function ensureAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth');
}

router.get('/', ensureAuth, (req, res) => {
    res.render('ai');
});

router.post('/generate', ensureAuth, async (req, res) => {
    const { type, nom, prenom, date, lieu, infractions, temoins, details } = req.body;

    let prompt = '';

    if (type === 'interpellation') {
        prompt = `Génère un procès-verbal d'intervement professionnel pour la Police Municipale de Paris avec les informations suivantes:
- Nom: ${nom}
- Prénom: ${prenom}
- Date: ${date}
- Lieu: ${lieu}
- Infractions constatées: ${infractions}
- Témoins: ${temoins}
- Détails: ${details}

Le procès-verbal doit être rédigé dans un style professionnel et juridique, en suivant le format standard des PV de police municipale.`;
    } else if (type === 'constat') {
        prompt = `Génère un constat de contravention pour la Police Municipale de Paris avec les informations suivantes:
- Nom: ${nom}
- Prénom: ${prenom}
- Date: ${date}
- Lieu: ${lieu}
- Infraction: ${infractions}
- Détails: ${details}

Le constat doit être rédigé dans un style professionnel et juridique.`;
    } else if (type === 'rapport') {
        prompt = `Génère un rapport d'activité pour la Police Municipale de Paris avec les informations suivantes:
- Date: ${date}
- Lieu: ${lieu}
- Détails: ${details}

Le rapport doit être rédigé dans un style professionnel.`;
    }

    try {
        // Placeholder pour l'API OpenAI
        const response = `📄 Procès-verbal généré avec succès!\n\nType: ${type}\nNom: ${nom} ${prenom}\nDate: ${date}\nLieu: ${lieu}\n\n${prompt}\n\n[La génération IA sera disponible après configuration de la clé API OpenAI]`;
        res.json({ success: true, content: response });
    } catch (error) {
        res.json({ success: false, error: 'Erreur lors de la génération' });
    }
});

module.exports = router;
