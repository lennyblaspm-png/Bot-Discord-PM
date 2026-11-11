const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} = require('discord.js');

const forms = {
    recruitment: {
        modalId: 'rc_recruitment_modal',
        title: 'Merci de remplir le formulaire ci-dessous !',
        ticket: {
            service: 'Centre de Recrutement de la Police Municipale',
            slug: 'recrutement',
            emoji: '👮',
            categoryId: '1489721395511431300',
            roleIds: ['1489721185334722570']
        },
        fields: [
            { id: 'rp_name', label: 'NOM Prénom RP', style: TextInputStyle.Short },
            { id: 'current_situation', label: 'Quelle est votre situation actuelle ?', style: TextInputStyle.Short },
            { id: 'join_reason', label: 'Pourquoi souhaitez-vous nous rejoindre ?', style: TextInputStyle.Paragraph },
            { id: 'motivation_letter', label: 'Lettre de Motivation', style: TextInputStyle.Paragraph },
            { id: 'cv', label: 'CV', style: TextInputStyle.Short, placeholder: 'Lien vers votre CV' }
        ]
    },
    direction: {
        modalId: 'rc_direction_modal',
        title: 'Please explain your issue in full detail',
        ticket: {
            service: 'Direction Générale de la Police Municipale',
            slug: 'direction',
            emoji: '🏛️',
            categoryId: '1489721380839755786',
            roleIds: ['1489721119312445512', '1489721106184016022']
        },
        fields: [
            { id: 'name', label: 'NOM Prénom', style: TextInputStyle.Short },
            {
                id: 'request_nature',
                label: 'Quel est la nature de votre demande ?',
                style: TextInputStyle.Paragraph,
                placeholder: 'Merci d’expliquer en détail la nature de votre demande'
            },
            {
                id: 'request_details',
                label: 'Développez votre demande',
                style: TextInputStyle.Paragraph,
                placeholder: 'Merci d’expliquer en détail la nature de votre demande'
            }
        ]
    }
};

function createRequestModal(form) {
    const modal = new ModalBuilder()
        .setCustomId(form.modalId)
        .setTitle(form.title);

    for (const field of form.fields) {
        const input = new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label)
            .setStyle(field.style)
            .setRequired(true);

        if (field.placeholder) input.setPlaceholder(field.placeholder);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    return modal;
}

function readRequestAnswers(interaction, form) {
    return form.fields.map(field => ({
        label: field.label,
        value: interaction.fields.getTextInputValue(field.id)
    }));
}

module.exports = { forms, createRequestModal, readRequestAnswers };
