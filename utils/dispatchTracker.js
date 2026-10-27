/**
 * Utilitaire: Dispatch Tracker
 * Stockage persistant des réponses aux dispatch
 */

const { run, get, all } = require('../config/database');

const dispatchResponses = new Map();

function saveResponse(messageId, data) {
    try {
        const existing = get('SELECT message_id FROM dispatch_responses WHERE message_id = ?', [messageId]);
        if (existing) {
            run(
                'UPDATE dispatch_responses SET present = ?, retard = ?, absent = ?, retard_justifications = ? WHERE message_id = ?',
                [JSON.stringify(data.present), JSON.stringify(data.retard), JSON.stringify(data.absent), JSON.stringify(data.retardJustifications || {}), messageId]
            );
        } else {
            run(
                'INSERT INTO dispatch_responses (guild_id, channel_id, message_id, present, retard, absent, retard_justifications, dispatch_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [data.guildId, data.channelId, messageId, JSON.stringify(data.present), JSON.stringify(data.retard), JSON.stringify(data.absent), JSON.stringify(data.retardJustifications || {}), data.dispatchDate || new Date().toISOString().slice(0, 10)]
            );
        }
    } catch (e) {
        console.error('[DispatchTracker] Erreur sauvegarde:', e);
    }
}

function loadResponses() {
    try {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        const rows = all('SELECT * FROM dispatch_responses WHERE dispatch_date = ?', [today]);
        for (const row of rows) {
            dispatchResponses.set(row.message_id, {
                guildId: row.guild_id,
                channelId: row.channel_id,
                messageId: row.message_id,
                present: JSON.parse(row.present || '[]'),
                retard: JSON.parse(row.retard || '[]'),
                absent: JSON.parse(row.absent || '[]'),
                retardJustifications: JSON.parse(row.retard_justifications || '{}'),
                dispatchDate: row.dispatch_date,
                timestamp: Date.now()
            });
        }
        console.log(`[DispatchTracker] ${rows.length} réponse(s) chargée(s) pour aujourd'hui`);
    } catch (e) {
        console.error('[DispatchTracker] Erreur chargement:', e);
    }
}

function setAndSave(messageId, data) {
    dispatchResponses.set(messageId, data);
    saveResponse(messageId, data);
}

function clearTodayDispatches() {
    try {
        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
        run('DELETE FROM dispatch_responses WHERE dispatch_date = ?', [today]);
    } catch (e) {
        console.error('[DispatchTracker] Erreur nettoyage:', e);
    }
}

module.exports = { responses: dispatchResponses, saveResponse, loadResponses, setAndSave, clearTodayDispatches };
