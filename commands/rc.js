const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const Logger = require('../utils/logger');

const PANEL_CHANNEL_ID = '1490695239214563399';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rc')
        .setDescription('Déployer le panel de recrutement et de contact de la direction')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = await interaction.guild.channels.fetch(PANEL_CHANNEL_ID);
        if (!channel || !channel.isTextBased()) {
            return interaction.reply({
                content: `❌ Le salon du panel <#${PANEL_CHANNEL_ID}> est introuvable ou n'est pas un salon textuel.`,
                ephemeral: true
            });
        }

        const botPermissions = channel.permissionsFor(interaction.guild.members.me);
        if (!botPermissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return interaction.reply({
                content: '❌ Je n’ai pas les permissions nécessaires dans le salon du panel.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎫 Police Municipale — Recrutement & Direction')
            .setDescription(
                'Choisissez le motif de votre demande. Un salon privé sera créé avec l’équipe concernée.\n\n' +
                '👮 **Centre de Recrutement de la Police Municipale**\n' +
                'Pour déposer une candidature ou poser une question concernant le recrutement.\n\n' +
                '🏛️ **Direction Générale de la Police Municipale**\n' +
                'Pour contacter la direction générale.'
            )
            .setColor('#1E3A5F')
            .setFooter({ text: 'Police Municipale RH' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('rc_ticket_recruitment')
                .setLabel('Recrutement')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👮'),
            new ButtonBuilder()
                .setCustomId('rc_ticket_direction')
                .setLabel('Contacter la direction')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏛️')
        );

        await interaction.deferReply({ ephemeral: true });
        try {
            const message = await channel.send({ embeds: [embed], components: [row] });
            Logger.info(`Panel /rc déployé dans #${channel.name} par ${interaction.user.tag}`);
            await interaction.editReply({ content: `✅ Panel déployé dans ${channel} (${message.url}).` });
        } catch (error) {
            Logger.error('Erreur lors du déploiement du panel /rc', error);
            await interaction.editReply({ content: '❌ Une erreur est survenue pendant le déploiement du panel.' });
        }
    }
};
