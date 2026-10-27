const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Logger = require('../utils/logger');

const SANCTION_ROLE_IDS = [
    '1533118103762894949',
    '1533118486245539870',
    '1533118647998877816'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Retirer tous les rôles de sanction')
        .addUserOption(option =>
            option.setName('membre')
                .setDescription('Membre dont vous voulez retirer les sanctions (par défaut : vous)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('membre') || interaction.user;

        const guild = interaction.guild;
        const member = await guild.members.fetch(targetUser.id).catch(() => null);

        if (!member) {
            return interaction.reply({
                content: '❌ Membre introuvable sur ce serveur.',
                flags: 64
            });
        }

        // Retirer tous les rôles de sanction présents
        const rolesToRemove = SANCTION_ROLE_IDS.filter(roleId => member.roles.cache.has(roleId));

        if (rolesToRemove.length === 0) {
            return interaction.reply({
                content: `✅ ${targetUser} n'a aucun rôle de sanction.`,
                flags: 64
            });
        }

        try {
            await member.roles.remove(rolesToRemove);
        } catch (error) {
            Logger.error('[Kill] Erreur lors du retrait des rôles de sanction', error);
            return interaction.reply({
                content: '❌ Impossible de retirer les rôles de sanction (permissions du bot ?).',
                flags: 64
            });
        }

        Logger.info(`[Kill] ${rolesToRemove.length} rôle(s) de sanction retiré(s) à ${targetUser.tag} par ${interaction.user.tag}`);

        const embed = new EmbedBuilder()
            .setTitle('☠️ ・Sanctions retirées')
            .setDescription(
                `> *Tous les rôles de sanction ont été retirés*\n\n` +
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n\n` +
                `> 👤 **Agent** ・ <@${targetUser.id}>\n` +
                `> ☠️ **Retiré par** ・ <@${interaction.user.id}>\n` +
                `> 🛡️ **Rôles retirés** ・ ${rolesToRemove.length}/${SANCTION_ROLE_IDS.length}\n\n` +
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━**`
            )
            .setColor('#00FF00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
