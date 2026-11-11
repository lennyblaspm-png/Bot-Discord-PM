const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ServiceModel = require('../models/Service');
const { deployTicketPanel } = require('../utils/ticketPanel');
const Logger = require('../utils/logger');

const TICKET_PANEL_CHANNEL_ID = '1489721713766695022';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panelall')
        .setDescription('Déployer ou actualiser le grand panel de tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild } = interaction;
        const services = ServiceModel.getAll(guild.id);
        if (services.length === 0) {
            return interaction.reply({
                content: '❌ Aucun service configuré. Utilisez `/rhconfig` pour en configurer.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await guild.channels.fetch(TICKET_PANEL_CHANNEL_ID);
            if (!channel || !channel.isTextBased()) {
                return interaction.editReply({
                    content: `❌ Le salon du grand panel <#${TICKET_PANEL_CHANNEL_ID}> est introuvable ou n'est pas textuel.`
                });
            }

            const result = await deployTicketPanel(guild, channel, { republish: true });
            Logger.info(`Grand panel ${result.replaced ? 'remplacé' : 'déployé'} via /panelall par ${interaction.user.tag}`);
            await interaction.editReply({
                content: `✅ Grand panel publié en bas de ${channel}${result.replaced ? ' ; l’ancien message a été supprimé' : ''}.`
            });
        } catch (error) {
            Logger.error('Erreur lors de l’exécution de /panelall', error);
            await interaction.editReply({
                content: '❌ Impossible de déployer le grand panel. Vérifiez les permissions du bot, le salon et les services configurés.'
            });
        }
    }
};
