const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { responses, loadResponses, setAndSave, clearTodayDispatches } = require('./dispatchTracker');
const EmbedUtils = require('./embedBuilder');
const Logger = require('./logger');
const AttendanceModel = require('../models/Attendance');
const AbsenceModel = require('../models/Absence');
const ConfigModel = require('../models/Config');

let client = null;
const attendanceRemindersInProgress = new Set();
const absenceExpiryInProgress = new Set();

// Tracking séparé pour chaque tâche
let dispatchSentDate = null;
let reminderSentDate = null;
let summarySentDate = null;

const DISPATCH_CHANNEL_ID = '1500956378334761090';
const DISPATCH_ROLE_ID = '1489721198073090078';

function startScheduler(discordClient) {
    client = discordClient;
    Logger.info('Scheduler démarré');

    // Charger les réponses du jour depuis la DB
    loadResponses();

    setInterval(checkScheduledTasks, 30000);
    Logger.info('[Scheduler] Vérification toutes les 30s');
}

function getParisHours() {
    return parseInt(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }));
}

function getParisMinutes() {
    return parseInt(new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris', minute: 'numeric' }));
}

function getParisDate() {
    return new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function checkScheduledTasks() {
    if (!client) return;

    const hours = getParisHours();
    const minutes = getParisMinutes();
    const today = getParisDate();

    // Reset les dates si on change de jour
    if (dispatchSentDate && dispatchSentDate !== today) dispatchSentDate = null;
    if (reminderSentDate && reminderSentDate !== today) reminderSentDate = null;
    if (summarySentDate && summarySentDate !== today) summarySentDate = null;

    checkAttendanceReminders();
    expireAbsences();

    // Dispatch à 8h00
    if (hours === 8 && minutes === 0 && dispatchSentDate !== today) {
        dispatchSentDate = today;
        Logger.info('[Scheduler] Déclenchement dispatch 8h');
        sendDispatch();
    }

    async function checkAttendanceReminders() {
        if (!client) return;

        for (const guild of client.guilds.cache.values()) {
            if (attendanceRemindersInProgress.has(guild.id)) continue;

            const lastSentValue = ConfigModel.get(guild.id, 'attendance_reminder_last_sent');
            if (!lastSentValue) {
                ConfigModel.set(guild.id, 'attendance_reminder_last_sent', new Date().toISOString());
                continue;
            }

            const lastSent = Date.parse(lastSentValue);
            if (!Number.isFinite(lastSent) || Date.now() - lastSent < 2 * 60 * 60 * 1000) continue;

            const active = AttendanceModel.getActive(guild.id);
            if (active.length === 0) continue;

            const channelId = ConfigModel.get(guild.id, 'attendance_channel_id');
            if (!channelId) {
                Logger.warn(`[Pointeuse] Aucun salon configuré pour le rappel dans ${guild.name}; réutilisez /service dans le salon souhaité.`);
                continue;
            }

            attendanceRemindersInProgress.add(guild.id);
            try {
                const channel = await client.channels.fetch(channelId);
                if (!channel || !channel.isTextBased()) {
                    Logger.error(`[Pointeuse] Salon de rappel ${channelId} introuvable ou non textuel dans ${guild.name}`);
                    continue;
                }

                const members = [...new Set(active.map(entry => entry.user_id))];
                const description = members
                    .map(userId => {
                        const sessions = active.filter(entry => entry.user_id === userId);
                        const status = sessions.some(entry => entry.on_pause) ? ' ⏸️ En pause' : ' 🟢 En service';
                        return `• <@${userId}>${status}`;
                    })
                    .join('\n');

                await channel.send({
                    content: members.map(userId => `<@${userId}>`).join(' '),
                    embeds: [EmbedUtils.create(guild.id, {
                        title: '⏰ Rappel de la pointeuse',
                        description: `Vous êtes toujours enregistré(s) en service :\n\n${description}\n\nPensez à terminer votre service si vous avez fini.`,
                        color: '#FF8C00'
                    })],
                    allowedMentions: { users: members }
                });
                ConfigModel.set(guild.id, 'attendance_reminder_last_sent', new Date().toISOString());
                Logger.info(`[Pointeuse] Rappel envoyé à ${members.length} agent(s) dans ${guild.name}`);
            } catch (error) {
                Logger.error(`[Pointeuse] Erreur lors du rappel dans ${guild.name}`, error);
            } finally {
                attendanceRemindersInProgress.delete(guild.id);
            }
        }
    }

    async function expireAbsences() {
        if (!client) return;

        for (const absence of AbsenceModel.getExpired()) {
            const absenceKey = String(absence.id);
            if (absenceExpiryInProgress.has(absenceKey)) continue;
            absenceExpiryInProgress.add(absenceKey);

            try {
                const guild = client.guilds.cache.get(absence.guild_id);
                if (!guild) {
                    Logger.warn(`[Absence] Serveur ${absence.guild_id} introuvable pour l'absence #${absence.id}`);
                    continue;
                }

                if (!AbsenceModel.hasLaterAbsence(absence.guild_id, absence.user_id, absence.id)) {
                    const member = await guild.members.fetch(absence.user_id).catch(error => {
                        if (error.code === 10007) return null;
                        throw error;
                    });
                    if (member) {
                        const role = await guild.roles.fetch('1489721280302284961');
                        if (role && member.roles.cache.has(role.id)) {
                            await member.roles.remove(role, 'Fin de la période d’absence');
                        }
                    }
                }

                AbsenceModel.markExpired(absence.id);
                Logger.info(`[Absence] Absence #${absence.id} expirée; rôle absent retiré si nécessaire`);
            } catch (error) {
                Logger.error(`[Absence] Erreur lors de l'expiration de l'absence #${absence.id}`, error);
            } finally {
                absenceExpiryInProgress.delete(absenceKey);
            }
        }
    }

    // Rappel à 18h00
    if (hours === 18 && minutes === 0 && reminderSentDate !== today) {
        reminderSentDate = today;
        Logger.info('[Scheduler] Déclenchement rappel 18h');
        sendDispatchReminder();
    }

    // Résumé à 21h00
    if (hours === 21 && minutes === 0 && summarySentDate !== today) {
        summarySentDate = today;
        Logger.info('[Scheduler] Déclenchement résumé 21h');
        sendDispatchSummary();
    }
}

async function sendDispatchReminder() {
    try {
        const channel = await client.channels.fetch(DISPATCH_CHANNEL_ID);
        if (!channel) {
            Logger.error('[Scheduler] Salon dispatch introuvable');
            return;
        }

        const embed = EmbedUtils.create(channel.guild.id, {
            title: '⏰ Rappel Dispatch - POLICE MUNICIPALE PARIS 75',
            description: `<@&${DISPATCH_ROLE_ID}>

**Rappel important !**

Le **dispatch** est ouvert depuis ce matin.
N'oubliez pas de confirmer votre présence !

**Police Municipale de Paris**`,
            color: '#FF8C00'
        });

        await channel.send({ content: `<@&${DISPATCH_ROLE_ID}>`, embeds: [embed] });
        Logger.info('[Scheduler] Rappel dispatch envoyé à 18h');
    } catch (error) {
        Logger.error('[Scheduler] Erreur envoi rappel dispatch', error);
    }
}

async function sendDispatch() {
    try {
        const channel = await client.channels.fetch(DISPATCH_CHANNEL_ID);
        if (!channel) {
            Logger.error('[Scheduler] Salon dispatch introuvable');
            return;
        }

        const dateStr = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const embed = EmbedUtils.create(channel.guild.id, {
            title: '🚨 Dispatch - POLICE MUNICIPALE PARIS 75',
            description: `Date : **${dateStr}**
Heure dispatch : **21h00**

Bonjour à tous,
Chaque jour, un dispatch sera publié pour organiser les interventions de la soirée. Ce document est essentiel pour la coordination des équipes et l'efficacité des opérations.

⚠️ **Important !**
Présence obligatoire ! Il est impératif que chaque agent confirme sa présence ou son absence en cochant la case correspondante dans le document. Cela nous permet d'anticiper les effectifs disponibles et d'ajuster les missions en fonction.

🟢 **Présent** ― 🟠 **Retard** ― 🔴 **Absent**

En cas d'absence imprévue, veuillez informer le service de coordination au plus vite afin de permettre un ajustement des équipes.

Merci de votre collaboration et de votre vigilance pour assurer une couverture optimale des missions.

**Police Municipale de Paris**`,
            color: '#FF0000'
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('dispatch_present')
                .setLabel('Présent')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🟢'),
            new ButtonBuilder()
                .setCustomId('dispatch_retard')
                .setLabel('Retard')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🟠'),
            new ButtonBuilder()
                .setCustomId('dispatch_absent')
                .setLabel('Absent')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴')
        );

        const msg = await channel.send({ content: `<@&${DISPATCH_ROLE_ID}>`, embeds: [embed], components: [row] });

        const dispatchDate = new Date().toISOString().slice(0, 10);
        const data = {
            guildId: channel.guild.id,
            channelId: channel.id,
            messageId: msg.id,
            present: [],
            retard: [],
            absent: [],
            retardJustifications: {},
            dispatchDate: dispatchDate,
            timestamp: Date.now()
        };

        setAndSave(msg.id, data);

        Logger.info(`[Scheduler] Dispatch envoyé à 8h (message ID: ${msg.id})`);
    } catch (error) {
        Logger.error('[Scheduler] Erreur envoi dispatch', error);
    }
}

async function sendDispatchSummary() {
    if (!client) return;

    Logger.info(`[Dispatch] Début résumé. ${responses.size} dispatch(es) en mémoire.`);

    if (responses.size === 0) {
        Logger.warn('[Dispatch] Aucun dispatch en mémoire! Le dispatch de 8h a-t-il été envoyé?');
        return;
    }

    try {
        // Ignorer les entrées NDS (système distinct) : seules les entrées dispatch comptent
        const dispatchEntries = [...responses.values()].filter(d => !String(d.dispatchDate || '').startsWith('nds_'));
        if (dispatchEntries.length === 0) {
            Logger.warn('[Dispatch] Aucune entrée dispatch en mémoire! Le dispatch de 8h a-t-il été envoyé?');
            return;
        }

        const guild = client.guilds.cache.get(dispatchEntries[0].guildId);
        if (!guild) {
            Logger.error('[Dispatch] Guild introuvable');
            return;
        }

        const channel = await client.channels.fetch(DISPATCH_CHANNEL_ID);
        if (!channel) {
            Logger.error(`[Dispatch] Salon dispatch ${DISPATCH_CHANNEL_ID} introuvable`);
            return;
        }

        const dispatchRole = guild.roles.cache.get(DISPATCH_ROLE_ID);
        if (!dispatchRole) {
            Logger.error(`[Dispatch] Rôle dispatch ${DISPATCH_ROLE_ID} introuvable`);
            return;
        }

        const allMemberIds = dispatchRole.members.filter(m => !m.user.bot).map(m => m.id);
        Logger.info(`[Dispatch] ${allMemberIds.length} membres avec le rôle dispatch`);

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

        // Une personne ne peut être que dans une seule catégorie (priorité : retard > absent > présent)
        absent.forEach(id => { present.delete(id); retard.delete(id); });
        present.forEach(id => { retard.delete(id); });

        const responded = new Set([...present, ...retard, ...absent]);
        const noResponse = allMemberIds.filter(id => !responded.has(id));

        Logger.info(`[Dispatch] Présents: ${present.size}, Retards: ${retard.size}, Absents: ${absent.size}, Pas de réponse: ${noResponse.length}`);

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
            description: `Bilan de présence du dispatch du **${dateStr}**.`,
            fields: [
                { name: `🟢 Présents (${present.size})`, value: formatList(present, '🟢'), inline: true },
                { name: `🟠 Retards (${retard.size})`, value: formatList(retard, '🟠', retardJustifications), inline: true },
                { name: `🔴 Absents (${absent.size})`, value: formatList(absent, '🔴'), inline: true },
                { name: `❓ Pas de réponse (${noResponse.length})`, value: formatNoResponse(noResponse), inline: false }
            ],
            color: '#FFD700',
            footer: 'Police Municipale de Paris - Résumé automatique'
        });

        // Un seul message, uniquement dans le salon dispatch
        await channel.send({ content: `<@&${DISPATCH_ROLE_ID}>`, embeds: [summaryEmbed] });
        Logger.info(`[Dispatch] Résumé envoyé dans #${channel.name}`);
    } catch (error) {
        Logger.error('[Dispatch] Erreur résumé dispatch', error);
    }

    // Nettoyer la mémoire ET la base pour éviter tout renvoi après un redémarrage
    // (on conserve les entrées NDS qui ont leur propre suivi à 48h)
    for (const [messageId, data] of responses.entries()) {
        if (!String(data.dispatchDate || '').startsWith('nds_')) {
            responses.delete(messageId);
        }
    }
    clearTodayDispatches();
    Logger.info('[Dispatch] Mémoire nettoyée');
}

module.exports = { startScheduler };
