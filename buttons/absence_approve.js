module.exports = {
    customId: 'absence_approve_',

    async execute(interaction) {
        await interaction.reply({
            content: 'La validation des absences a été supprimée. Les nouvelles absences sont enregistrées automatiquement.',
            ephemeral: true
        });
    }
};
