/**
 * Configuration du bot PoliceMunicipale-RH
 * Gère toutes les configurations dynamiques depuis SQLite
 */

require('dotenv').config();

const config = {
    // Token Discord
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    // Configuration par défaut
    defaultEmbedColor: process.env.DEFAULT_EMBED_COLOR || '#1E3A5F',
    defaultFooterText: process.env.DEFAULT_FOOTER_TEXT || 'Police Municipale RH',
    ticketLogChannel: process.env.TICKET_LOG_CHANNEL || 'ticket-logs',
    ticketTranscriptChannel: process.env.TICKET_TRANSCRIPT_CHANNEL || 'ticket-transcripts',
    ticketCategory: process.env.TICKET_CATEGORY || 'Tickets',

    // Temps
    reminderInterval: parseInt(process.env.REMINDER_INTERVAL) || 24,
    reminderMax: parseInt(process.env.REMINDER_MAX) || 3,
    commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 5,
    buttonCooldown: parseInt(process.env.BUTTON_COOLDOWN) || 3,

    // Services par défaut
    defaultServices: [
        { name: 'Directeur', emoji: '👔', color: '#FF0000', description: 'Direction Générale', category_id: '1501231009910358179', role_id: '1489721109350715773' },
        { name: 'Directeur Adjoint', emoji: '🎯', color: '#FF4500', description: 'Direction Adjointe', category_id: '1501231344192327722', role_id: '1489721112802758857' },
        { name: 'Chef de Police', emoji: '👮', color: '#FFD700', description: 'Commandement Police', category_id: '1501170914195148930', role_id: '1489721115873120266' },
        { name: 'Chef de Service de Première Classe', emoji: '⭐', color: '#00FF00', description: 'Service 1ère Classe', category_id: '1570062288864415896', role_id: '1489721128397308015;1489721130980872482' },
        { name: 'Chef de Service de Seconde Classe', emoji: '🌟', color: '#32CD32', description: 'Service 2ème Classe', category_id: '1570062288864415896', role_id: '1489721128397308015;1489721130980872482' },
        { name: 'BMU', emoji: '🚨', color: '#0000FF', description: 'Brigade Motorisée Urbaine', category_id: '1501231507304612164', role_id: '1533080263142408252' },
        { name: 'GSI', emoji: '🔍', color: '#8A2BE2', description: 'Groupe de Soutien et d\'Intervention', category_id: '1501231537067393146', role_id: '1489721206943912116' },
        { name: 'Brigade VTT', emoji: '🏍️', color: '#FF69B4', description: 'Brigade VTT', category_id: '1530981106621616388', role_id: '822122011442413590' },
        { name: 'Suggestions Police Municipale', emoji: '💡', color: '#00CED1', description: 'Suggestions et Améliorations', category_id: '1501231567408730112', role_id: '1489721119312445512' },
        { name: 'Rapport', emoji: '📝', color: '#FFA500', description: 'Rapports d\'activité', category_id: '1501231598555889826', role_id: '1489721119312445512' },
        { name: 'Plainte', emoji: '⚠️', color: '#DC143C', description: 'Plaintes et Signalements', category_id: '1501231630990184609', role_id: '1489721106184016022' },
        { name: 'Démission', emoji: '📋', color: '#808080', description: 'Demandes de Démission', category_id: '1501231678373494784', role_id: '1489721119312445512' }
    ],

    // Permissions admin
    adminPermissions: ['Administrator', 'ManageGuild'],

    // Limites
    maxTicketsPerUser: 3,
    maxMessagesTranscript: 200
};

module.exports = config;
