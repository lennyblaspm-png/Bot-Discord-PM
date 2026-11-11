const { EmbedBuilder } = require('discord.js');
const AbsenceModel = require('../models/Absence');
const Logger = require('../utils/logger');
const { parseFrenchDateTime } = require('../utils/absenceDates');

const ABSENCE_ROLE_ID = '1489721280302284961';

module.exports = {
    customId: 'absence_modal',

    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const startDate = interaction.fields.getTextInputValue('absence_start');
        const endDate = interaction.fields.getTextInputValue('absence_end');
        const reason = interaction.fields.getTextInputValue('absence_reason');
        const startDateISO = parseFrenchDateTime(startDate);
        const endDateISO = parseFrenchDateTime(endDate);

        if (!startDateISO || !endDateISO || new Date(endDateISO) <= new Date(startDateISO)) {
            return interaction.reply({
                content: '❌ Dates invalides. Utilisez JJ/MM/AAAA HH:MM et indiquez une fin après le début.',
                ephemeral: true
            });
        }

        const role = await interaction.guild.roles.fetch(ABSENCE_ROLE_ID);
        const botMember = interaction.guild.members.me;
        if (!role || !botMember || !botMember.permissions.has('ManageRoles') || botMember.roles.highest.comparePositionTo(role) <= 0) {
            Logger.error(`[Absence] Impossible d'attribuer le rôle ${ABSENCE_ROLE_ID} dans ${interaction.guild.name}`);
            return interaction.reply({
                content: '❌ Le rôle absent est introuvable ou je ne peux pas le gérer. Vérifiez mes permissions et la hiérarchie des rôles.',
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(userId);
        const result = AbsenceModel.create({
            guild_id: guildId,
            user_id: userId,
            start_date: startDateISO,
            end_date: endDateISO,
            reason
        });

        try {
            await member.roles.add(role, 'Déclaration automatique d’absence');
        } catch (error) {
            AbsenceModel.deleteById(result.lastInsertRowid);
            throw error;
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 ・Absence déclarée')
            .setDescription(
                `> *Votre absence est enregistrée et le rôle ${role} vous a été attribué.*\n\n` +
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n\n` +
                `> 📅 **Début** ・ \`${startDate}\`\n` +
                `> 📅 **Fin** ・ \`${endDate}\`\n` +
                `> 📝 **Motif** ・ ${reason}\n` +
                `> 👤 **Agent** ・ <@${userId}>\n\n` +
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━**`
            )
            .setColor('#2ECC71')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });

        Logger.info(`Absence déclarée par ${interaction.user.tag}: ${startDate} au ${endDate}`);
    }
};
