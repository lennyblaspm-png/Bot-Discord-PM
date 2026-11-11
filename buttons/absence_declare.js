const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    customId: 'absence_declare',

    async execute(interaction, client) {
        const modal = new ModalBuilder()
            .setCustomId('absence_modal')
            .setTitle('Déclarer une absence');

        const startInput = new TextInputBuilder()
            .setCustomId('absence_start')
            .setLabel('Début (JJ/MM/AAAA HH:MM)')
            .setPlaceholder('Ex: 15/12/2026 09:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const endInput = new TextInputBuilder()
            .setCustomId('absence_end')
            .setLabel('Fin (JJ/MM/AAAA HH:MM)')
            .setPlaceholder('Ex: 20/12/2026 18:00')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('absence_reason')
            .setLabel('Motif')
            .setPlaceholder('Expliquez brièvement la raison de votre absence')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const firstRow = new ActionRowBuilder().addComponents(startInput);
        const secondRow = new ActionRowBuilder().addComponents(endInput);
        const thirdRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(firstRow, secondRow, thirdRow);

        await interaction.showModal(modal);
    }
};
