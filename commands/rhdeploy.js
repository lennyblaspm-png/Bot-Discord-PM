/**
 * Commande: /rhdeploy
 * Déploiement du panneau de ticket
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const ServiceModel = require('../models/Service');
const { deployTicketPanel } = require('../utils/ticketPanel');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rhdeploy')
        .setDescription('Déployer le panneau de ticket')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon où déployer le panneau')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guild = interaction.guild;
        const guildId = guild.id;
        const channel = interaction.options.getChannel('salon');

        const services = ServiceModel.getAll(guildId);
        if (services.length === 0) {
            return interaction.reply({
                content: '❌ Aucun service configuré. Utilisez `/rhconfig` pour en configurer.',
                flags: 64
            });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            await deployTicketPanel(guild, channel);
            Logger.info(`Panneau déployé dans #${channel.name} par ${interaction.user.tag}`);

            await interaction.editReply({
                content: `✅ Panneau déployé avec succès dans ${channel} !`
            });
        } catch (error) {
            Logger.error('Erreur lors du déploiement', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors du déploiement : vérifiez les permissions du bot, le salon et les services configurés.'
            });
        }
    }
};
