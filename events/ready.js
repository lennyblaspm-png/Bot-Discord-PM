/**
 * Event: ready
 * Événement déclenché lorsque le bot est prêt
 */

const { Events, ActivityType } = require('discord.js');
const config = require('../config/config');
const ServiceModel = require('../models/Service');
const ConfigModel = require('../models/Config');
const StaffModel = require('../models/Staff');
const Logger = require('../utils/logger');
const { deployTicketPanel } = require('../utils/ticketPanel');

const TICKET_PANEL_CHANNEL_ID = '1489721713766695022';

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        Logger.info(`Bot connecté en tant que ${client.user.tag}`);
        Logger.info(`Serveurs: ${client.guilds.cache.size}`);
        Logger.info(`Utilisateurs: ${client.users.cache.size}`);

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

        try {
            const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
            if (!channel || !channel.isTextBased() || !channel.guild) {
                throw new Error(`Salon de panel ticket ${TICKET_PANEL_CHANNEL_ID} introuvable ou non textuel`);
            }

            const result = await deployTicketPanel(channel.guild, channel);
            Logger.info(`[Tickets] Grand panel ${result.updated ? 'mis à jour' : 'publié'} dans #${channel.name}`);
        } catch (error) {
            Logger.error('[Tickets] Échec du déploiement automatique du grand panel', error);
        }

        Logger.info('Bot prêt à fonctionner !');
    }
};
