const { forms, createRequestModal } = require('../utils/requestTicketForms');

module.exports = {
    customId: 'rc_ticket_direction',

    async execute(interaction) {
        await interaction.showModal(createRequestModal(forms.direction));
    }
};
