const createRequestTicket = require('../utils/requestTicket');
const { forms, readRequestAnswers } = require('../utils/requestTicketForms');

module.exports = {
    customId: forms.recruitment.modalId,

    async execute(interaction, client) {
        await createRequestTicket(
            interaction,
            client,
            forms.recruitment.ticket,
            readRequestAnswers(interaction, forms.recruitment)
        );
    }
};
