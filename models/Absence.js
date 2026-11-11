const { run, get, all } = require('../config/database');

class AbsenceModel {
    static create(data) {
        return run(
            'INSERT INTO absences (guild_id, user_id, start_date, end_date, reason, message_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [data.guild_id, data.user_id, data.start_date, data.end_date, data.reason, data.message_id || null, 'approved']
        );
    }

    static getById(id) {
        return get('SELECT * FROM absences WHERE id = ?', [id]);
    }

    static getExpired(now = new Date().toISOString()) {
        return all(
            'SELECT * FROM absences WHERE status = ? AND end_date <= ? ORDER BY end_date ASC',
            ['approved', now]
        );
    }

    static hasLaterAbsence(guildId, userId, absenceId, now = new Date().toISOString()) {
        return Boolean(get(
            'SELECT id FROM absences WHERE guild_id = ? AND user_id = ? AND id != ? AND status = ? AND end_date > ? LIMIT 1',
            [guildId, userId, absenceId, 'approved', now]
        ));
    }

    static markExpired(id) {
        return run('UPDATE absences SET status = ? WHERE id = ?', ['expired', id]);
    }

    static deleteById(id) {
        return run('DELETE FROM absences WHERE id = ?', [id]);
    }

    static getPending(guildId) {
        return all('SELECT * FROM absences WHERE guild_id = ? AND status = ? ORDER BY created_at DESC', [guildId, 'pending']);
    }

    static getAll(guildId, limit = 20) {
        return all('SELECT * FROM absences WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?', [guildId, limit]);
    }

    static approve(id, reviewedBy) {
        return run('UPDATE absences SET status = ?, reviewed_by = ? WHERE id = ?', ['approved', reviewedBy, id]);
    }

    static reject(id, reviewedBy) {
        return run('UPDATE absences SET status = ?, reviewed_by = ? WHERE id = ?', ['rejected', reviewedBy, id]);
    }

    static updateMessageId(id, messageId) {
        return run('UPDATE absences SET message_id = ? WHERE id = ?', [messageId, id]);
    }

    static isActive(guildId, userId) {
        const now = new Date().toISOString();
        return get(
            'SELECT * FROM absences WHERE guild_id = ? AND user_id = ? AND status = ? AND start_date <= ? AND end_date >= ?',
            [guildId, userId, 'approved', now, now]
        );
    }
}

module.exports = AbsenceModel;
