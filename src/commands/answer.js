import { SlashCommandBuilder } from "@discordjs/builders";

const { SUGGESTION_CHANNEL_ID } = process.env;

/** @type {import("../lib/types/command").default} */
const info = {
  data: new SlashCommandBuilder()
    .setDescription("Answer a thread in #suggestions")
    .addStringOption((option) =>
      option
        .setName("answer")
        .setDescription("Answer to the suggestion")
        .setRequired(true)
    ),

  async interaction(interaction) {
    const answer = interaction.options.getString("answer");
    if (!SUGGESTION_CHANNEL_ID || !answer) return;
    interaction.guild?.channels
      .fetch(interaction.channelId)
      .then(async (thread) => {
        if (!thread) return;
        if (thread.parentId !== SUGGESTION_CHANNEL_ID) return;
        thread.setName(thread.name.replace(/(.*) \|/i, answer + " |"));
        interaction.reply({
          content: ":white_check_mark: Thread renamed!",
        });
      });
  },
};

export default info;
