/**
 * Commande: /rename
 * Renomme un ticket
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const TicketModel = require('../models/Ticket');
const LogModel = require('../models/Log');
const EmbedUtils = require('../utils/embedBuilder');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Renommer un ticket')
        .addStringOption(option =>
            option.setName('nom')
                .setDescription('Nouveau nom du ticket')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const newName = interaction.options.getString('nom');
        const channel = interaction.channel;

        // Vérifier que c'est un salon de ticket
        const ticket = TicketModel.getByChannel(channel.id);
        if (!ticket) {
            return interaction.reply({
                content: '❌ Ce salon n\'est pas un ticket.',
                ephemeral: true
            });
        }

        // Vérifier que c'est un salon de ticket (pattern)
        if (!channel.name.includes('-')) {
            return interaction.reply({
                content: '❌ Ce salon n\'est pas un ticket.',
                ephemeral: true
            });
        }

        // Renommer le salon (autorisé : lettres, chiffres, tirets et emojis)
        const cleanName = newName
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D-]/gu, '-');
        
        try {
            await channel.setName(cleanName);

            // Mettre à jour la base de données
            TicketModel.update(channel.id, { channel_name: cleanName });

            // Logger l'action
            LogModel.create({
                guild_id: guildId,
                ticket_id: ticket.id,
                action: 'ticket_rename',
                user_id: interaction.user.id,
                details: `Renommé en "${cleanName}"`
            });

            Logger.info(`Ticket #${ticket.ticket_number} renommé en "${cleanName}" par ${interaction.user.tag}`);

            const embed = EmbedUtils.success(guildId, 'Ticket renommé', `Le ticket a été renommé en **${cleanName}**.`);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            Logger.error('Erreur lors du renommage', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du renommage.',
                ephemeral: true
            });
        }
    }
};
