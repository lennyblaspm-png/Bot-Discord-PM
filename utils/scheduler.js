const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { responses, loadResponses, setAndSave } = require('./dispatchTracker');
const EmbedUtils = require('./embedBuilder');
const Logger = require('./logger');

let client = null;
let dispatchAdminId = null;

// Tracking séparé pour chaque tâche
let dispatchSentDate = null;
let reminderSentDate = null;
let summarySentDate = null;

const DISPATCH_CHANNEL_ID = '1500956378334761090';
const DISPATCH_ROLE_ID = '1489721198073090078';
const RECAP_CHANNEL_ID = '1489721606505889873';
const RECAP_USER_IDS = ['1086766492873404499'];

const SANCTIONS = [
    '1533118103762894949',
    '1533118486245539870',
    '1533118647998877816'
];
const SANCTION_FINAL_ROLE = '1489721268378009831';

function startScheduler(discordClient) {
    client = discordClient;
    Logger.info('Scheduler démarré');

    // Charger les réponses du jour depuis la DB
    loadResponses();

    setInterval(checkScheduledTasks, 30000);
    Logger.info('[Scheduler] Vérification toutes les 30s');
}

function setDispatchAdmin(userId) {
    dispatchAdminId = userId;
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

    // Dispatch à 8h00
    if (hours === 8 && minutes === 0 && dispatchSentDate !== today) {
        dispatchSentDate = today;
        Logger.info('[Scheduler] Déclenchement dispatch 8h');
        sendDispatch();
    }

    // Rappel à 18h00
    if (hours === 18 && minutes === 0 && reminderSentDate !== today) {
        reminderSentDate = today;
        Logger.info('[Scheduler] Déclenchement rappel 18h');
        sendDispatchReminder();
    }

    // Résumé + sanctions à 21h00
    if (hours === 21 && minutes === 0 && summarySentDate !== today) {
        summarySentDate = today;
        Logger.info('[Scheduler] Déclenchement résumé+sanctions 21h');
        sendDispatchSummaryAndSanctions();
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

async function sendDispatchSummaryAndSanctions() {
    if (!client) return;

    Logger.info(`[Dispatch] Début résumé et sanctions. ${responses.size} dispatch(es) en mémoire.`);

    if (responses.size === 0) {
        Logger.warn('[Dispatch] Aucun dispatch en mémoire! Le dispatch de 8h a-t-il été envoyé?');
        return;
    }

    for (const [messageId, data] of responses.entries()) {
        try {
            const guild = client.guilds.cache.get(data.guildId);
            if (!guild) {
                Logger.error(`[Dispatch] Guild ${data.guildId} introuvable`);
                continue;
            }

            const channel = guild.channels.cache.get(data.channelId);
            if (!channel) {
                Logger.error(`[Dispatch] Channel ${data.channelId} introuvable`);
                continue;
            }

            const dispatchRole = guild.roles.cache.get(DISPATCH_ROLE_ID);
            if (!dispatchRole) {
                Logger.error(`[Dispatch] Rôle dispatch ${DISPATCH_ROLE_ID} introuvable`);
                continue;
            }

            const allMembers = dispatchRole.members.filter(m => !m.user.bot);
            const allMemberIds = allMembers.map(m => m.id);

            Logger.info(`[Dispatch] ${allMemberIds.length} membres avec le rôle dispatch`);

            const responded = new Set([...data.present, ...data.retard, ...data.absent]);
            const noResponse = allMemberIds.filter(id => !responded.has(id));

            Logger.info(`[Dispatch] Présents: ${data.present.length}, Retards: ${data.retard.length}, Absents: ${data.absent.length}, Pas de réponse: ${noResponse.length}`);

            const formatList = (arr, emoji, justifications = null) => {
                if (arr.length === 0) return 'Aucun';
                return arr.map(id => {
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
                    { name: `🟢 Présents (${data.present.length})`, value: formatList(data.present, '🟢'), inline: true },
                    { name: `🟠 Retards (${data.retard.length})`, value: formatList(data.retard, '🟠', data.retardJustifications), inline: true },
                    { name: `🔴 Absents (${data.absent.length})`, value: formatList(data.absent, '🔴'), inline: true },
                    { name: `❓ Pas de réponse (${noResponse.length})`, value: formatNoResponse(noResponse), inline: false }
                ],
                color: '#FFD700',
                footer: 'Police Municipale de Paris - Résumé automatique'
            });

            // Envoyer dans le salon dispatch
            await channel.send({ content: `<@&${DISPATCH_ROLE_ID}>`, embeds: [summaryEmbed] });
            Logger.info(`[Dispatch] Résumé envoyé dans #${channel.name}`);

            // Envoyer dans le salon récap
            try {
                const recapChannel = await client.channels.fetch(RECAP_CHANNEL_ID);
                if (recapChannel) {
                    await recapChannel.send({ embeds: [summaryEmbed] });
                    Logger.info(`[Dispatch] Récap envoyé dans #${recapChannel.name}`);
                } else {
                    Logger.error(`[Dispatch] Salon récap ${RECAP_CHANNEL_ID} introuvable`);
                }
            } catch (e) {
                Logger.error('[Dispatch] Erreur envoi récap salon', e);
            }

            // Envoyer en MP aux utilisateurs spécifiques
            for (const userId of RECAP_USER_IDS) {
                try {
                    Logger.info(`[Dispatch] Tentative MP à ${userId}...`);
                    const user = await client.users.fetch(userId);
                    if (user) {
                        await user.send({ embeds: [summaryEmbed] });
                        Logger.info(`[Dispatch] MP envoyé à ${user.tag} (${userId})`);
                    }
                } catch (e) {
                    Logger.error(`[Dispatch] Erreur envoi MP à ${userId}: ${e.message}`);
                }
            }

            // Appliquer les sanctions
            Logger.info(`[Dispatch] Application des sanctions pour ${noResponse.length} personne(s)...`);
            for (const userId of noResponse) {
                try {
                    const member = guild.members.cache.get(userId);
                    if (!member) {
                        Logger.warn(`[Dispatch] Membre ${userId} introuvable dans le cache, tentative fetch...`);
                        try {
                            const fetchedMember = await guild.members.fetch(userId);
                            if (fetchedMember) {
                                await applySanction(fetchedMember, userId);
                            }
                        } catch (fetchErr) {
                            Logger.error(`[Dispatch] Impossible de fetch le membre ${userId}: ${fetchErr.message}`);
                        }
                        continue;
                    }

                    await applySanction(member, userId);
                } catch (error) {
                    Logger.error(`[Dispatch] Erreur sanction pour ${userId}: ${error.message}`);
                }
            }

        } catch (error) {
            Logger.error('[Dispatch] Erreur résumé dispatch', error);
        }
    }

    responses.clear();
    Logger.info('[Dispatch] Mémoire nettoyée');
}

async function applySanction(member, userId) {
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
            Logger.info(`[Dispatch] Sanction ${nextSanctionIndex + 1} appliquée à ${member.user.tag}`);
        } else {
            Logger.info(`[Dispatch] ${member.user.tag} a déjà la sanction ${nextSanctionIndex + 1}`);
        }
    } else {
        if (!member.roles.cache.has(SANCTION_FINAL_ROLE)) {
            await member.roles.add(SANCTION_FINAL_ROLE);
            Logger.info(`[Dispatch] Rôle d'exclusion ajouté à ${member.user.tag}`);
        } else {
            Logger.info(`[Dispatch] ${member.user.tag} a déjà le rôle d'exclusion`);
        }
    }
}

module.exports = { startScheduler, setDispatchAdmin };
