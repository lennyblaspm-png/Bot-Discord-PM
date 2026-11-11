const createRequestTicket = require('../utils/requestTicket');
const { forms, readRequestAnswers } = require('../utils/requestTicketForms');

module.exports = {
    customId: forms.direction.modalId,

    async execute(interaction, client) {
        await createRequestTicket(
            interaction,
            client,
            forms.direction.ticket,
            readRequestAnswers(interaction, forms.direction)
        );
    }
};
