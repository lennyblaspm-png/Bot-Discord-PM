module.exports = {
    customId: 'absence_reject_',

    async execute(interaction) {
        await interaction.reply({
            content: 'Le refus des absences a été supprimé. Les nouvelles absences sont enregistrées automatiquement.',
            ephemeral: true
        });
    }
};
