const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AttendanceModel = require('../models/Attendance');
const ConfigModel = require('../models/Config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('service')
        .setDescription('Pointeuse de service')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const active = AttendanceModel.getActive(guildId);

        let activeList = '';
        if (active.length === 0) {
            activeList = '*Aucun utilisateur n\'est en service... :(*';
        } else {
            active.forEach(a => {
                const clockIn = new Date(a.clock_in.replace(' ', 'T') + 'Z');
                const time = clockIn.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
                const pauseStatus = a.on_pause ? ' `⏸ PAUSE`' : '';
                activeList += `> <@${a.user_id}>・\`${time}\`${pauseStatus}\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`👤 Utilisateurs en service - (${active.length})`)
            .setDescription(activeList)
            .setColor('#2b2d31')
            .setFooter({ text: '⚠️ Si le BOT ne répond pas, cela peut signifier qu\'il redémarre' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('attendance_btn_start').setLabel('Démarrer son service').setStyle(ButtonStyle.Success).setEmoji('🟢'),
            new ButtonBuilder().setCustomId('attendance_btn_pause').setLabel('Prendre / Terminer sa pause').setStyle(ButtonStyle.Primary).setEmoji('⏸️'),
            new ButtonBuilder().setCustomId('attendance_btn_stop').setLabel('Terminer son service').setStyle(ButtonStyle.Danger).setEmoji('🔴')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        const panelMessage = await interaction.fetchReply();
        ConfigModel.set(guildId, 'attendance_channel_id', interaction.channelId);
        ConfigModel.set(guildId, 'attendance_message_id', panelMessage.id);
        if (!ConfigModel.get(guildId, 'attendance_reminder_last_sent')) {
            ConfigModel.set(guildId, 'attendance_reminder_last_sent', new Date().toISOString());
        }
    }
};
