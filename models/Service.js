/**
 * Model: Service
 * Gestion des services
 */

const { run, get, all } = require('../config/database');

class ServiceModel {
    /**
     * Récupère tous les services d'un serveur
     */
    static getAll(guildId) {
        return all('SELECT * FROM services WHERE guild_id = ? AND is_active = 1 ORDER BY sort_order ASC', [guildId]);
    }

    /**
     * Récupère un service par son nom
     */
    static getByName(guildId, name) {
        return get('SELECT * FROM services WHERE guild_id = ? AND name = ?', [guildId, name]);
    }

    /**
     * Récupère un service par son ID
     */
    static getById(id) {
        return get('SELECT * FROM services WHERE id = ?', [id]);
    }

    /**
     * Crée un service
     */
    static create(data) {
        return run(
            `INSERT INTO services (guild_id, name, emoji, color, description, category_id, role_id, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.guild_id, data.name, data.emoji, data.color, data.description, data.category_id, data.role_id, data.sort_order || 0]
        );
    }

    /**
     * Met à jour un service
     */
    static update(guildId, name, data) {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return null;
        values.push(guildId, name);
        return run(`UPDATE services SET ${fields.join(', ')} WHERE guild_id = ? AND name = ?`, values);
    }

    /**
     * Supprime un service
     */
    static delete(guildId, name) {
        return run('UPDATE services SET is_active = 0 WHERE guild_id = ? AND name = ?', [guildId, name]);
    }

    /**
     * Initialise les services par défaut
     */
    static initDefaults(guildId) {
        const existing = this.getAll(guildId);
        if (existing.length > 0) return;

        const defaults = [
            { name: 'Directeur', emoji: '👔', color: '#FF0000', description: 'Direction Générale', category_id: '1501231009910358179', role_id: '1489721109350715773', sort_order: 1 },
            { name: 'Directeur Adjoint', emoji: '🎯', color: '#FF4500', description: 'Direction Adjointe', category_id: '1501231344192327722', role_id: '1489721112802758857', sort_order: 2 },
            { name: 'Chef de Police', emoji: '👮', color: '#FFD700', description: 'Commandement Police', category_id: '1501170914195148930', role_id: '1489721115873120266', sort_order: 3 },
            { name: 'Chef de Service de Première Classe', emoji: '⭐', color: '#00FF00', description: 'Service 1ère Classe', category_id: '1501231389528555651', role_id: '1489721121409339574', sort_order: 4 },
            { name: 'Chef de Service de Seconde Classe', emoji: '🌟', color: '#32CD32', description: 'Service 2ème Classe', category_id: '1501231479232004096', role_id: '1489721125209374884', sort_order: 5 },
            { name: 'BMU', emoji: '🚨', color: '#0000FF', description: 'Brigade Motorisée Urbaine', category_id: '1501231507304612164', role_id: '1533080263142408252', sort_order: 6 },
            { name: 'GSI', emoji: '🔍', color: '#8A2BE2', description: 'Groupe de Soutien et d\'Intervention', category_id: '1501231537067393146', role_id: '1489721206943912116', sort_order: 7 },
            { name: 'Brigade VTT', emoji: '🏍️', color: '#FF69B4', description: 'Brigade VTT', category_id: '1530981106621616388', role_id: '822122011442413590', sort_order: 8 },
            { name: 'Suggestions Police Municipale', emoji: '💡', color: '#00CED1', description: 'Suggestions et Améliorations', category_id: '1501231567408730112', role_id: '1489721119312445512;1489721106184016022', sort_order: 9 },
            { name: 'Rapport', emoji: '📝', color: '#FFA500', description: 'Rapports d\'activité', category_id: '1501231598555889826', role_id: '1489721119312445512', sort_order: 10 },
            { name: 'Plainte', emoji: '⚠️', color: '#DC143C', description: 'Plaintes et Signalements', category_id: '1501231630990184609', role_id: '1489721106184016022', sort_order: 11 },
            { name: 'Démission', emoji: '📋', color: '#808080', description: 'Demandes de Démission', category_id: '1501231678373494784', role_id: '1489721119312445512', sort_order: 12 }
        ];

        defaults.forEach(service => this.create({ ...service, guild_id: guildId }));
    }

    /**
     * Récupère les stats par service
     */
    static getStats(guildId) {
        return all('SELECT service, COUNT(*) as count FROM tickets WHERE guild_id = ? GROUP BY service ORDER BY count DESC', [guildId]);
    }

    /**
     * Supprime tous les services d'un serveur
     */
    static deleteAll(guildId) {
        return run('DELETE FROM services WHERE guild_id = ?', [guildId]);
    }
}

module.exports = ServiceModel;
