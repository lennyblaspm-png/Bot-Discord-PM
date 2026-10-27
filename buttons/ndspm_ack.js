const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { saveResponse, responses } = require('../utils/dispatchTracker');
const Logger = require('../utils/logger');

module.exports = {
    customId: 'ndspm_ack',

    async execute(interaction, client) {
        const userId = interaction.user.id;
        const messageId = interaction.message.id;

        if (!responses.has(messageId)) {
            responses.set(messageId, {
                guildId: interaction.guild.id,
                channelId: interaction.channel.id,
                messageId: messageId,
                present: [],
                retard: [],
                absent: [],
                retardJustifications: {},
                dispatchDate: `nds_${Date.now()}`,
                timestamp: Date.now()
            });
        }

        const data = responses.get(messageId);

        // Retirer des autres catégories
        data.present = data.present.filter(id => id !== userId);
        data.retard = data.retard.filter(id => id !== userId);
        data.absent = data.absent.filter(id => id !== userId);

        // Ajouter aux présents (lu et approuvé)
        if (!data.present.includes(userId)) {
            data.present.push(userId);
        }

        saveResponse(messageId, data);

        // Mettre à jour les boutons avec les compteurs
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ndspm_ack')
                .setLabel(`Lu et approuvé (${data.present.length})`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );

        try {
            await interaction.message.edit({ components: [row] });
        } catch (e) {}

        await interaction.reply({
            content: '✅ Vous avez confirmé la lecture du NDS.',
            ephemeral: true
        });

        Logger.info(`[NDS] ${interaction.user.tag} a confirmé la lecture du NDS`);

        // Planifier la vérification 48h plus tard
        setTimeout(async () => {
            try {
                const freshData = responses.get(messageId);
                if (!freshData) return;

                const guild = client.guilds.cache.get(freshData.guildId);
                if (!guild) return;

                // Trouver le rôle mentionné dans le message original
                const channel = guild.channels.cache.get(freshData.channelId);
                if (!channel) return;

                const msg = await channel.messages.fetch(messageId);
                if (!msg) return;

                // Extraire le rôle du message
                const roleMatch = msg.content.match(/<@&(\d+)>/);
                if (!roleMatch) return;

                const roleId = roleMatch[1];
                const role = guild.roles.cache.get(roleId);
                if (!role) return;

                const allMembers = role.members.filter(m => !m.user.bot);
                const allMemberIds = allMembers.map(m => m.id);
                const acknowledged = new Set(freshData.present);
                const notAcked = allMemberIds.filter(id => !acknowledged.has(id));

                if (notAcked.length === 0) return;

                Logger.info(`[NDS] 48h écoulées. ${notAcked.length} personne(s) n'ont pas confirmé la lecture.`);

                // Envoyer le résumé
                const summaryEmbed = new EmbedBuilder()
                    .setTitle('📋・Résumé NDS - Lu et approuvé')
                    .setDescription(`Personnes n'ayant pas confirmé la lecture du NDS sous 48h :`)
                    .setColor('#FF0000')
                    .setTimestamp();

                const notAckedList = notAcked.map(id => {
                    const member = guild.members.cache.get(id);
                    return member ? `<@${id}>` : 'Inconnu';
                }).join('\n');

                summaryEmbed.addFields({
                    name: `❌ Non confirmé (${notAcked.length})`,
                    value: notAckedList || 'Aucun'
                });

                // Notifier dans le salon
                await channel.send({ content: `<@&${roleId}>`, embeds: [summaryEmbed] });

                // Appliquer les sanctions
                const SANCTIONS = [
                    '1533118103762894949',
                    '1533118486245539870',
                    '1533118647998877816'
                ];
                const SANCTION_FINAL_ROLE = '1489721268378009831';

                for (const userId of notAcked) {
                    try {
                        const member = guild.members.cache.get(userId);
                        if (!member) continue;

                        let nextSanctionIndex = 0;
                        for (let i = 0; i < SANCTIONS.length; i++) {
                            if (member.roles.cache.has(SANCTIONS[i])) {
                                nextSanctionIndex = i + 1;
                            }
                        }

                        if (nextSanctionIndex < SANCTIONS.length) {
                            const newRoleId = SANCTIONS[nextSanctionIndex];
                            if (!member.roles.cache.has(newRoleId)) {
                                await member.roles.add(newRoleId);
                                Logger.info(`[NDS] Sanction ${nextSanctionIndex + 1} appliquée à ${member.user.tag}`);
                            }
                        } else {
                            if (!member.roles.cache.has(SANCTION_FINAL_ROLE)) {
                                await member.roles.add(SANCTION_FINAL_ROLE);
                                Logger.info(`[NDS] Rôle d'exclusion ajouté à ${member.user.tag}`);
                            }
                        }
                    } catch (error) {
                        Logger.error(`[NDS] Erreur sanction pour ${userId}`, error);
                    }
                }

                // Nettoyer
                responses.delete(messageId);

            } catch (error) {
                Logger.error('[NDS] Erreur vérification 48h', error);
            }
        }, 48 * 60 * 60 * 1000); // 48 heures
    }
};
