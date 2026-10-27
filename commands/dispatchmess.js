const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { responses } = require('../utils/dispatchTracker');
const EmbedUtils = require('../utils/embedBuilder');
const Logger = require('../utils/logger');

const DISPATCH_CHANNEL_ID = '1500956378334761090';
const DISPATCH_ROLE_ID = '1489721198073090078';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dispatchmess')
        .setDescription('Renvoyer le récap du dispatch manuellement')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        if (responses.size === 0) {
            return interaction.editReply({ content: '❌ Aucun dispatch en cours. Le dispatch de 8h a-t-il été envoyé ?' });
        }

        try {
            // Ignorer les entrées NDS : seules les entrées dispatch comptent
            const dispatchEntries = [...responses.values()].filter(d => !String(d.dispatchDate || '').startsWith('nds_'));
            if (dispatchEntries.length === 0) {
                return interaction.editReply({ content: '❌ Aucun dispatch en cours. Le dispatch de 8h a-t-il été envoyé ?' });
            }

            const guild = client.guilds.cache.get(dispatchEntries[0].guildId);
            if (!guild) {
                return interaction.editReply({ content: '❌ Serveur introuvable.' });
            }

            const channel = await client.channels.fetch(DISPATCH_CHANNEL_ID);
            if (!channel) {
                return interaction.editReply({ content: `❌ Salon dispatch ${DISPATCH_CHANNEL_ID} introuvable.` });
            }

            const dispatchRole = guild.roles.cache.get(DISPATCH_ROLE_ID);
            if (!dispatchRole) {
                return interaction.editReply({ content: '❌ Rôle dispatch introuvable.' });
            }

            const allMemberIds = dispatchRole.members.filter(m => !m.user.bot).map(m => m.id);

            // Fusionner toutes les réponses suivies en un seul bilan
            const present = new Set();
            const retard = new Set();
            const absent = new Set();
            const retardJustifications = {};

            for (const data of dispatchEntries) {
                (data.present || []).forEach(id => present.add(id));
                (data.retard || []).forEach(id => retard.add(id));
                (data.absent || []).forEach(id => absent.add(id));
                Object.assign(retardJustifications, data.retardJustifications || {});
            }

            absent.forEach(id => { present.delete(id); retard.delete(id); });
            present.forEach(id => { retard.delete(id); });

            const responded = new Set([...present, ...retard, ...absent]);
            const noResponse = allMemberIds.filter(id => !responded.has(id));

            const formatList = (arr, emoji, justifications = null) => {
                if (arr.length === 0) return 'Aucun';
                return [...arr].map(id => {
                    const member = guild.members.cache.get(id);
                    const name = member ? `<@${id}>` : 'Inconnu';
                    if (justifications && justifications[id]) {
                        const j = justifications[id];
                        return `${emoji} ${name} ― \`${j.arrivalTime}\` ― ${j.reason}`;
                    }
                    return `${emoji} ${name}`;
                }).join('\n');
            };

            const formatNoResponse = (arr) => {
                if (arr.length === 0) return 'Aucun';
                return arr.map(id => {
                    const member = guild.members.cache.get(id);
                    return `❓ ${member ? `<@${id}>` : 'Inconnu'}`;
                }).join('\n');
            };

            const dateStr = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            const summaryEmbed = EmbedUtils.create(guild.id, {
                title: `📋 Résumé Dispatch - ${dateStr}`,
                description: `Bilan de présence du dispatch du **${dateStr}**.\n\n> *Renvoyé manuellement via /dispatchmess*`,
                fields: [
                    { name: `🟢 Présents (${present.size})`, value: formatList(present, '🟢'), inline: true },
                    { name: `🟠 Retards (${retard.size})`, value: formatList(retard, '🟠', retardJustifications), inline: true },
                    { name: `🔴 Absents (${absent.size})`, value: formatList(absent, '🔴'), inline: true },
                    { name: `❓ Pas de réponse (${noResponse.length})`, value: formatNoResponse(noResponse), inline: false }
                ],
                color: '#FFD700',
                footer: 'Résumé dispatch - Renvoi manuel'
            });

            // Un seul message, uniquement dans le salon dispatch
            await channel.send({ content: `<@&${DISPATCH_ROLE_ID}>`, embeds: [summaryEmbed] });
            Logger.info(`[DispatchMess] Résumé envoyé dans #${channel.name}`);

            await interaction.editReply({ content: '✅ Résumé renvoyé avec succès.' });
        } catch (error) {
            Logger.error('[DispatchMess] Erreur envoi résumé', error);
            await interaction.editReply({ content: `❌ Erreur: ${error.message}` });
        }
    }
};
