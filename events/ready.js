/**
 * Event: ready
 * Événement déclenché lorsque le bot est prêt
 */

const { Events, ActivityType } = require('discord.js');
const config = require('../config/config');
const { initDatabase } = require('../config/database');
const ServiceModel = require('../models/Service');
const ConfigModel = require('../models/Config');
const StaffModel = require('../models/Staff');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        Logger.info(`Bot connecté en tant que ${client.user.tag}`);
        Logger.info(`Serveurs: ${client.guilds.cache.size}`);
        Logger.info(`Utilisateurs: ${client.users.cache.size}`);

        // Initialiser la base de données
        initDatabase();

        // Définir le statut
        client.user.setActivity('Police Municipale RH', { type: ActivityType.Watching });

        // Initialiser les configurations pour chaque serveur
        client.guilds.cache.forEach(guild => {
            ConfigModel.initDefaults(guild.id);
            ServiceModel.initDefaults(guild.id);
            Logger.info(`Configuration initialisée pour ${guild.name}`);
        });

        // Mettre à jour les stats des agents en ligne
        client.guilds.cache.forEach(guild => {
            guild.members.cache.forEach(member => {
                if (!member.user.bot && member.presence?.status !== 'offline') {
                    StaffModel.setOnline(member.id, guild.id, true);
                }
            });
        });

        Logger.info('Bot prêt à fonctionner !');
    }
};
