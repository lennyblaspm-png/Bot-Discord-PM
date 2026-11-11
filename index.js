/**
 * PoliceMunicipale-RH
 * Bot Discord Premium - Gestion RH Police Municipale
 * 
 * @author PoliceMunicipale-RH
 * @version 1.0.0
 */

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const config = require('./config/config');
const { initDatabase, saveDatabase } = require('./config/database');
const CommandHandler = require('./handlers/commandHandler');
const EventHandler = require('./handlers/eventHandler');
const ButtonHandler = require('./handlers/buttonHandler');
const SelectMenuHandler = require('./handlers/selectMenuHandler');
const ModalHandler = require('./handlers/modalHandler');
const Logger = require('./utils/logger');
const { startScheduler } = require('./utils/scheduler');

// Vérifier les variables d'environnement
if (!config.token) {
    Logger.error('Le token Discord n\'est pas configuré. Vérifiez votre fichier .env');
    process.exit(1);
}

if (!config.clientId || !config.guildId) {
    Logger.error('CLIENT_ID et GUILD_ID doivent être configurés. Vérifiez votre fichier .env');
    process.exit(1);
}

// Créer le client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// Attacher les handlers au client
client.commandHandler = new CommandHandler(client);
client.buttonHandler = new ButtonHandler(client);
client.selectMenuHandler = new SelectMenuHandler(client);
client.modalHandler = new ModalHandler(client);

// Démarrer le bot
async function startBot() {
    try {
        Logger.info('Démarrage du bot PoliceMunicipale-RH...');
        await initDatabase();

        // Charger les événements
        const eventHandler = new EventHandler(client);
        await eventHandler.loadEvents();

        // Charger les commandes
        await client.commandHandler.loadCommands();

        // Charger les boutons
        await client.buttonHandler.loadButtons();

        // Charger les select menus
        await client.selectMenuHandler.loadMenus();

        // Charger les modales
        await client.modalHandler.loadModals();

        // Se connecter à Discord
        await client.login(config.token);

        // Démarrer le scheduler (dispatch 8h/18h/20h50)
        startScheduler(client);

        Logger.info('Bot démarré avec succès !');
    } catch (error) {
        Logger.error('Erreur lors du démarrage du bot', error);
        process.exit(1);
    }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERROR] Promesse rejetée:', reason instanceof Error ? reason.stack : reason);
});

process.on('uncaughtException', (error) => {
    console.error('[ERROR] Exception:', error.stack || error);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[ERROR] Exception monitor:', error.stack || error);
});

// Arrêt propre
process.on('SIGINT', () => {
    Logger.info('Arrêt du bot...');
    saveDatabase();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    Logger.info('Arrêt du bot...');
    saveDatabase();
    client.destroy();
    process.exit(0);
});

// Démarrer le bot
startBot();
