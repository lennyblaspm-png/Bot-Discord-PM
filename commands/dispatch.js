/**
 * Commande: /dispatch
 * Envoie un dispatch avec suivi de présence
 */

const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const EmbedUtils = require('../utils/embedBuilder');
const { responses } = require('../utils/dispatchTracker');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dispatch')
        .setDescription('Envoyer un dispatch')
        .addChannelOption(option =>
            option.setName('salon')
                .setDescription('Salon où envoyer le dispatch')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        const guild = interaction.guild;
        const channel = interaction.options.getChannel('salon');

        // Vérifier les permissions
        const botPerms = channel.permissionsFor(guild.members.me);
        if (!botPerms.has('SendMessages') || !botPerms.has('EmbedLinks')) {
            return interaction.reply({
                content: '❌ Je n\'ai pas les permissions dans ce salon.',
                ephemeral: true
            });
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const embed = EmbedUtils.create(guild.id, {
            title: '🚨 Dispatch - [POLICE MUNICIPALE PARIS 75]',
            description: `Date : **${dateStr}**
Heure dispatch : **21h00**

**Bonjour à tous,**
**Chaque jour, un dispatch sera publié pour organiser les interventions de la soirée. Ce document est essentiel pour la coordination des équipes et l'efficacité des opérations.**

⚠️ **Important !**
Présence obligatoire ! Il est impératif que chaque agent confirme sa présence ou son absence en cochant la case correspondante dans le document. Cela nous permet d'anticiper les effectifs disponibles et d'ajuster les missions en fonction.

🟢 **Présent** ― 🟠 **Retard** ― 🔴 **Absent**
**En cas d'absence imprévue, veuillez informer le service de coordination au plus vite afin de permettre un ajustement des équipes.**

Merci de votre collaboration et de votre vigilance pour assurer une couverture optimale des missions.

**Police Municipale de Paris**`,
            color: '#FFD700'
        });

        // Boutons de présence
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('dispatch_present')
                .setLabel('Présent (0)')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🟢'),
            new ButtonBuilder()
                .setCustomId('dispatch_retard')
                .setLabel('Retard (0)')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🟠'),
            new ButtonBuilder()
                .setCustomId('dispatch_absent')
                .setLabel('Absent (0)')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔴')
        );

        try {
            const message = await channel.send({ embeds: [embed], components: [row] });

            // Initialiser le tracking pour ce dispatch
            responses.set(message.id, {
                present: [],
                retard: [],
                absent: [],
                channelId: channel.id,
                guildId: guild.id
            });

            Logger.info(`Dispatch envoyé dans #${channel.name} par ${interaction.user.tag}`);

            await interaction.reply({
                content: `✅ Dispatch envoyé dans ${channel} !\n📋 Résumé automatique à **21h00**.`,
                ephemeral: true
            });
        } catch (error) {
            Logger.error('Erreur lors de l\'envoi du dispatch', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue.',
                ephemeral: true
            });
        }
    }
};
