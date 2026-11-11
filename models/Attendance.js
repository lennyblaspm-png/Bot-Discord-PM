const { run, get, all } = require('../config/database');

function nowUTC() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function nowMs() {
    return Date.now();
}

function parseToMs(dateStr) {
    return new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
}

class AttendanceModel {
    static clockIn(guildId, userId, serviceName) {
        const existing = get(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND user_id = ? AND service_name = ? AND status = ?',
            [guildId, userId, serviceName, 'active']
        );
        if (existing) return null;

        return run(
            'INSERT INTO service_attendance (guild_id, user_id, service_name, clock_in, status) VALUES (?, ?, ?, ?, ?)',
            [guildId, userId, serviceName, nowUTC(), 'active']
        );
    }

    static clockOut(guildId, userId, serviceName) {
        const record = get(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND user_id = ? AND service_name = ? AND status = ?',
            [guildId, userId, serviceName, 'active']
        );
        if (!record) return null;

        const now = nowMs();
        const clockInMs = parseToMs(record.clock_in);
        let duration = Math.floor((now - clockInMs) / 60000);

        if (record.on_pause && record.pause_start) {
            const pauseStartMs = parseToMs(record.pause_start);
            const pauseDuration = Math.floor((now - pauseStartMs) / 60000);
            duration -= pauseDuration;
        }

        if (duration < 0) duration = 0;

        run(
            'UPDATE service_attendance SET clock_out = ?, duration = ?, status = ? WHERE id = ?',
            [nowUTC(), duration, 'inactive', record.id]
        );

        return { ...record, duration };
    }

    static pause(guildId, userId, serviceName, isPause) {
        const record = get(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND user_id = ? AND service_name = ? AND status = ?',
            [guildId, userId, serviceName, 'active']
        );
        if (!record) return null;

        if (isPause) {
            run(
                'UPDATE service_attendance SET on_pause = 1, pause_start = ? WHERE id = ?',
                [nowUTC(), record.id]
            );
        } else {
            run(
                'UPDATE service_attendance SET on_pause = 0, pause_start = NULL WHERE id = ?',
                [record.id]
            );
        }

        return record;
    }

    static getActive(guildId) {
        return all(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND status = ? ORDER BY clock_in DESC',
            [guildId, 'active']
        );
    }

    static getActiveByService(guildId, serviceName) {
        return all(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND service_name = ? AND status = ? ORDER BY clock_in DESC',
            [guildId, serviceName, 'active']
        );
    }

    static getUserHistory(guildId, userId, limit = 10) {
        return all(
            'SELECT * FROM service_attendance WHERE guild_id = ? AND user_id = ? ORDER BY clock_in DESC LIMIT ?',
            [guildId, userId, limit]
        );
    }

    static getTodayStats(guildId) {
        return all(
            `SELECT service_name, COUNT(*) as total, 
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as currently_active
             FROM service_attendance 
             WHERE guild_id = ? AND date(clock_in) = date('now')
             GROUP BY service_name`,
            [guildId]
        );
    }

    static getAllToday(guildId) {
        return all(
            `SELECT sa.*, u.username 
             FROM service_attendance sa 
             LEFT JOIN users u ON sa.user_id = u.user_id AND sa.guild_id = u.guild_id
             WHERE sa.guild_id = ? AND date(sa.clock_in) = date('now')
             ORDER BY sa.clock_in DESC`,
            [guildId]
        );
    }

    static getWeeklyStats(guildId) {
        return all(
            `SELECT user_id, 
                    SUM(CASE 
                        WHEN status = 'active' THEN CAST((strftime('%s', 'now') - strftime('%s', clock_in)) / 60 AS INTEGER)
                        WHEN duration IS NOT NULL THEN duration 
                        ELSE 0 
                    END) as total_minutes,
                    COUNT(*) as total_sessions
             FROM service_attendance 
             WHERE guild_id = ? AND clock_in >= datetime('now', '-7 days')
             GROUP BY user_id 
             ORDER BY total_minutes DESC`,
            [guildId]
        );
    }

    static getWeeklyStatsByUser(guildId, userId) {
        return all(
            `SELECT service_name,
                    SUM(CASE 
                        WHEN status = 'active' THEN CAST((strftime('%s', 'now') - strftime('%s', clock_in)) / 60 AS INTEGER)
                        WHEN duration IS NOT NULL THEN duration 
                        ELSE 0 
                    END) as total_minutes,
                    COUNT(*) as total_sessions
             FROM service_attendance 
             WHERE guild_id = ? AND user_id = ? AND clock_in >= datetime('now', '-7 days')
             GROUP BY service_name 
             ORDER BY total_minutes DESC`,
            [guildId, userId]
        );
    }
}

module.exports = AttendanceModel;
