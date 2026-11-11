const { EmbedBuilder } = require('discord.js');
const AbsenceModel = require('../models/Absence');
const Logger = require('../utils/logger');
const { parseFrenchDate } = require('../utils/absenceDates');
const config = require('../config/config');

module.exports = {
    customId: 'absence_modal',

    async execute(interaction, client) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const startDate = interaction.fields.getTextInputValue('absence_start');
        const endDate = interaction.fields.getTextInputValue('absence_end');
        const reason = interaction.fields.getTextInputValue('absence_reason');
        const startDateISO = parseFrenchDate(startDate);
        const endDateISO = parseFrenchDate(endDate, true);

        if (!startDateISO || !endDateISO || new Date(endDateISO) <= new Date(startDateISO)) {
            return interaction.reply({
                content: '❌ Dates invalides. Utilisez JJ/MM/AAAA et indiquez une date de fin identique ou postérieure à la date de début.',
                ephemeral: true
            });
        }

        const role = await interaction.guild.roles.fetch(config.absenceRoleId);
        const botMember = interaction.guild.members.me;
        if (!role || !botMember || !botMember.permissions.has('ManageRoles') || botMember.roles.highest.comparePositionTo(role) <= 0) {
            Logger.error(`[Absence] Impossible d'attribuer le rôle ${config.absenceRoleId} dans ${interaction.guild.name}`);
            return interaction.reply({
                content: '❌ Le rôle absent est introuvable ou je ne peux pas le gérer. Vérifiez mes permissions et la hiérarchie des rôles.',
                ephemeral: true
            });
        }

        const absenceChannel = await interaction.guild.channels.fetch(config.absenceChannelId);
        if (!absenceChannel?.isTextBased()) {
            Logger.error(`[Absence] Salon ${config.absenceChannelId} introuvable ou non textuel dans ${interaction.guild.name}`);
            return interaction.reply({
                content: '❌ Le salon des déclarations d’absence est introuvable. Contactez un administrateur.',
                ephemeral: true
            });
        }

        const channelPermissions = absenceChannel.permissionsFor(botMember);
        if (
            !channelPermissions?.has('ViewChannel') ||
            !channelPermissions.has('SendMessages') ||
            !channelPermissions.has('EmbedLinks')
        ) {
            Logger.error(`[Absence] Permissions insuffisantes dans le salon ${config.absenceChannelId}`);
            return interaction.reply({
                content: '❌ Je ne peux pas publier la déclaration dans le salon des absences. Contactez un administrateur.',
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

        const alreadyHadAbsenceRole = member.roles.cache.has(role.id);
        let absenceMessage = null;
        try {
            await member.roles.add(role, 'Déclaration automatique d’absence');
            absenceMessage = await absenceChannel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📋 ・Absence déclarée')
                        .setDescription(
                            `> 👤 **Agent** ・ <@${userId}>\n` +
                            `> 📅 **Début** ・ \`${startDate}\`\n` +
                            `> 📅 **Fin** ・ \`${endDate}\`\n` +
                            `> 📝 **Motif** ・ ${reason}\n\n` +
                            `Le rôle ${role} sera retiré après la date de fin.`
                        )
                        .setColor('#2ECC71')
                        .setTimestamp()
                ],
                allowedMentions: { users: [userId] }
            });
            AbsenceModel.updateMessageId(result.lastInsertRowid, absenceMessage.id);
        } catch (error) {
            AbsenceModel.deleteById(result.lastInsertRowid);
            if (absenceMessage) {
                try {
                    await absenceMessage.delete();
                } catch (cleanupError) {
                    Logger.error(`[Absence] Impossible de supprimer le message ${absenceMessage.id} après échec`, cleanupError);
                }
            }
            if (!alreadyHadAbsenceRole) {
                try {
                    await member.roles.remove(role, 'Annulation après échec de déclaration');
                } catch (cleanupError) {
                    Logger.error(`[Absence] Impossible de retirer le rôle ${role.id} après échec`, cleanupError);
                }
            }
            throw error;
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ ・Absence déclarée')
            .setDescription(
                `> *Votre absence est enregistrée dans ${absenceChannel} et le rôle ${role} vous a été attribué.*\n\n` +
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
