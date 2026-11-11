const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const TicketModel = require('../models/Ticket');
const LogModel = require('../models/Log');
const EmbedUtils = require('./embedBuilder');
const Logger = require('./logger');
const config = require('../config/config');

async function createRequestTicket(interaction, client, options, answers = []) {
    await interaction.deferReply({ ephemeral: true });

    const { guild } = interaction;
    const openTickets = TicketModel.getOpenByUser(interaction.user.id, guild.id);
    if (openTickets.length >= (config.maxTicketsPerUser || 3)) {
        return interaction.editReply({ content: '❌ Vous avez déjà le maximum de tickets ouverts.' });
    }

    if (openTickets.some(ticket => ticket.service === options.service)) {
        return interaction.editReply({ content: `❌ Vous avez déjà un ticket ouvert pour **${options.service}**.` });
    }

    const category = await guild.channels.fetch(options.categoryId);
    if (!category || category.type !== ChannelType.GuildCategory) {
        Logger.error(`[Ticket /rc] Catégorie ${options.categoryId} invalide dans ${guild.name}`);
        return interaction.editReply({ content: '❌ La catégorie de ticket est introuvable ou invalide. Contactez un administrateur.' });
    }

    const roles = [];
    for (const roleId of options.roleIds) {
        const role = await guild.roles.fetch(roleId);
        if (!role) {
            Logger.error(`[Ticket /rc] Rôle administrateur ${roleId} introuvable dans ${guild.name}`);
            return interaction.editReply({ content: '❌ Un rôle de gestion des tickets est introuvable. Contactez un administrateur.' });
        }
        roles.push(role);
    }

    try {
        const ticketNumber = TicketModel.getNextNumber(guild.id);
        const namePart = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);
        const channelName = `${options.slug}-${namePart || interaction.user.id}`;
        const accessPermissions = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AttachFiles
        ];
        const permissionOverwrites = [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: accessPermissions },
            {
                id: client.user.id,
                allow: [...accessPermissions, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]
            },
            ...roles.map(role => ({ id: role.id, allow: accessPermissions }))
        ];

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites
        });

        try {
            TicketModel.create({
                ticket_number: ticketNumber,
                guild_id: guild.id,
                channel_id: ticketChannel.id,
                creator_id: interaction.user.id,
                service: options.service,
                category_id: category.id,
                channel_name: channelName
            });
        } catch (error) {
            await ticketChannel.delete('Échec de l’enregistrement du ticket');
            throw error;
        }

        LogModel.create({
            guild_id: guild.id,
            ticket_id: ticketNumber,
            action: 'ticket_open',
            user_id: interaction.user.id,
            details: `Service: ${options.service}`
        });

        const now = new Date();
        const embed = EmbedUtils.ticket(guild.id, {
            ticketNumber,
            service: { name: options.service, emoji: options.emoji, color: '#1E3A5F' },
            priority: 'Normal',
            description: `Ticket créé par ${interaction.user}`,
            fields: [
                { name: '📋 Numéro', value: `#${ticketNumber}`, inline: true },
                { name: '👤 Créé par', value: `${interaction.user}`, inline: true },
                { name: '🏷️ Service', value: options.service, inline: true },
                { name: '📅 Date', value: now.toLocaleDateString('fr-FR'), inline: true },
                { name: '🕐 Heure', value: now.toLocaleTimeString('fr-FR'), inline: true },
                { name: '🆔 ID', value: interaction.user.id, inline: true }
            ],
            author: { name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() },
            color: '#1E3A5F'
        });

        const controls = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_claim').setLabel('Prendre en charge').setStyle(ButtonStyle.Primary).setEmoji('📋'),
                new ButtonBuilder().setCustomId('ticket_rename').setLabel('Renommer').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
                new ButtonBuilder().setCustomId('ticket_priority').setLabel('Priorité').setStyle(ButtonStyle.Primary).setEmoji('🎯'),
                new ButtonBuilder().setCustomId('ticket_add_member').setLabel('Ajouter membre').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                new ButtonBuilder().setCustomId('ticket_remove_member').setLabel('Retirer membre').setStyle(ButtonStyle.Secondary).setEmoji('➖')
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_notes').setLabel('Notes').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
                new ButtonBuilder().setCustomId('ticket_lock').setLabel('Verrouiller').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId('ticket_unlock').setLabel('Déverrouiller').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Fermer').setStyle(ButtonStyle.Danger).setEmoji('❌')
            )
        ];

        await ticketChannel.send({ embeds: [embed], components: controls });
        for (const answer of answers) {
            const answerEmbed = EmbedUtils.create(guild.id, {
                title: answer.label,
                description: answer.value,
                color: '#1E3A5F'
            });
            await ticketChannel.send({ embeds: [answerEmbed], allowedMentions: { parse: [] } });
        }
        await ticketChannel.send({
            content: `${roles.map(role => `${role}`).join(' ')} — Nouveau ticket créé par ${interaction.user}`,
            allowedMentions: { users: [interaction.user.id], roles: roles.map(role => role.id) }
        });

        Logger.info(`Ticket #${ticketNumber} ouvert par ${interaction.user.tag} pour ${options.service}`);
        await interaction.editReply({ content: `✅ Ticket créé : ${ticketChannel}` });
    } catch (error) {
        Logger.error(`Erreur lors de la création du ticket ${options.service}`, error);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la création du ticket.' });
    }
}

module.exports = createRequestTicket;
