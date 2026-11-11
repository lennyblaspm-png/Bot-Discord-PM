const {
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const ServiceModel = require('../models/Service');
const ConfigModel = require('../models/Config');
const EmbedUtils = require('./embedBuilder');
const { run, get } = require('../config/database');

function buildTicketPanel(guildId) {
    ServiceModel.initDefaults(guildId);
    const services = ServiceModel.getAll(guildId);
    if (services.length === 0) {
        throw new Error(`Aucun service configuré pour le serveur ${guildId}`);
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_service_select')
        .setPlaceholder('Sélectionnez un service')
        .setMinValues(1)
        .setMaxValues(1);

    services.forEach(service => {
        selectMenu.addOptions({
            label: `${service.emoji} ${service.name}`,
            description: service.description || `Créer un ticket ${service.name}`,
            value: service.name,
            emoji: service.emoji
        });
    });

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_claim_all')
            .setLabel('Revendiquer')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📋'),
        new ButtonBuilder()
            .setCustomId('ticket_stats')
            .setLabel('Statistiques')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📊'),
        new ButtonBuilder()
            .setCustomId('ticket_close_all')
            .setLabel('Tout fermer')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );

    return { embeds: [EmbedUtils.deploy(guildId)], components: [row1, row2] };
}

async function deployTicketPanel(guild, channel) {
    const botMember = guild.members.me;
    const botPermissions = channel.permissionsFor(botMember);
    if (
        !botPermissions ||
        !botPermissions.has(PermissionFlagsBits.ViewChannel) ||
        !botPermissions.has(PermissionFlagsBits.SendMessages) ||
        !botPermissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
        throw new Error(`Permissions insuffisantes dans le salon ${channel.id}`);
    }

    ConfigModel.initDefaults(guild.id);
    const payload = buildTicketPanel(guild.id);
    const existing = get('SELECT * FROM dashboard WHERE guild_id = ?', [guild.id]);

    if (existing?.channel_id === channel.id && existing.message_id) {
        try {
            const existingMessage = await channel.messages.fetch(existing.message_id);
            await existingMessage.edit(payload);
            run('UPDATE dashboard SET last_update = datetime("now") WHERE guild_id = ?', [guild.id]);
            return { message: existingMessage, updated: true };
        } catch (error) {
            if (error.code !== 10008) throw error;
        }
    }

    const message = await channel.send(payload);
    if (existing) {
        run('UPDATE dashboard SET channel_id = ?, message_id = ?, last_update = datetime("now") WHERE guild_id = ?', [channel.id, message.id, guild.id]);
    } else {
        run('INSERT INTO dashboard (guild_id, channel_id, message_id) VALUES (?, ?, ?)', [guild.id, channel.id, message.id]);
    }

    return { message, updated: false };
}

module.exports = { buildTicketPanel, deployTicketPanel };
