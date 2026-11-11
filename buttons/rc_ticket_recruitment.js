const { forms, createRequestModal } = require('../utils/requestTicketForms');

module.exports = {
    customId: 'rc_ticket_recruitment',

    async execute(interaction) {
        await interaction.showModal(createRequestModal(forms.recruitment));
    }
};
