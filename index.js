const Discord = require('discord.js');
const Keyv = require('keyv');
const client = new Discord.Client();
const frenchWords = require('an-array-of-french-words');
require('dotenv').config();

const botToken = process.env.BOT_TOKEN;
const botPrefixCommand = "!";
let keyv = new Keyv();
if (process.env.DATABASE_URL)
    keyv = new Keyv(process.env.DATABASE_URL);

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

client.once('ready', () => {
    console.info('Ready!');
});

client.on('message', async message => {
    if (!message.content.startsWith(botPrefixCommand) || message.author.bot) return;

    const args = message.content.slice(botPrefixCommand.length).split(/ +/);
    const command = args.shift().toLowerCase();

    const guildID = message.guild.id;
    const realMembers = message.guild.members.filter(member => !member.user.bot);
    let guildDB = await keyv.get(guildID);

    if (!guildDB) {
        await keyv.set(guildID, {});
        guildDB = {};
    }

    if (guildDB["locked"]) {
        const discordMessage = await message.channel.send("I'm sorry a task is still in progress for your guild. Please wait for it to end.");
        discordMessage.delete(5000);
    }
    else if (command === "random") {
        guildDB["locked"] = true;
        await keyv.set(guildID, guildDB);

        let generalDiscordEmbed = {
            embed: {
                color: 3447003,
                title: "Alright chief! Randomizing now...",
                description: "Progress: 0/" + realMembers.size,
                fields: [{
                    name: "Unable to randomize the nickname of:",
                    value: "nobody yet"
                }],
                timestamp: new Date()
            }
        };
        const generalDiscordMessage = await message.channel.send(generalDiscordEmbed);
        let progressIterator = 0;

        for await (let member of realMembers) {
            member = member[1];
            const usernameID = member.user.id;
            const displayName = member.displayName;
            progressIterator++;
            generalDiscordEmbed.embed.description = "Progress: " + progressIterator + "/" + realMembers.size;
            await generalDiscordMessage.edit(generalDiscordEmbed);

            if (!(usernameID in guildDB)) {
                try {
                    const randomFrenchWord = frenchWords[Math.floor(Math.random() * frenchWords.length)];
                    await member.setNickname(capitalizeFirstLetter(randomFrenchWord));
                    guildDB[usernameID] = displayName;
                    await keyv.set(guildID, guildDB);
                } catch (error) {
                    if (generalDiscordEmbed.embed.fields[0].value === "nobody yet")
                        generalDiscordEmbed.embed.fields[0].value = "";
                    generalDiscordEmbed.embed.fields[0].value += "- " + displayName + ": " + error + "\n";
                    await generalDiscordMessage.edit(generalDiscordEmbed);
                }
            } else {
                if (generalDiscordEmbed.embed.fields[0].value === "nobody yet")
                    generalDiscordEmbed.embed.fields[0].value = "";
                generalDiscordEmbed.embed.fields[0].value += "- " + displayName + ": has already has his nickname randomized\n";
                await generalDiscordMessage.edit(generalDiscordEmbed);
            }
        }
        guildDB["locked"] = false;
        await keyv.set(guildID, guildDB);
        generalDiscordEmbed.embed.description = "All the members nickname have been randomized!";
        await generalDiscordMessage.edit(generalDiscordEmbed);
    } else if (command === "restore") {
        guildDB["locked"] = true;
        await keyv.set(guildID, guildDB);

        let generalDiscordEmbed = {
            embed: {
                color: 3447003,
                title: "Alright chief! Restoring now...",
                description: "Progress: 0/" + realMembers.size,
                fields: [{
                    name: "Unable to restore the nickname of:",
                    value: "nobody yet"
                }],
                timestamp: new Date()
            }
        };
        const generalDiscordMessage = await message.channel.send(generalDiscordEmbed);
        let progressIterator = 0;

        for await (let member of realMembers) {
            member = member[1];
            const usernameID = member.user.id;
            const displayName = member.displayName;
            progressIterator++;
            generalDiscordEmbed.embed.description = "Progress: " + progressIterator + "/" + realMembers.size;
            await generalDiscordMessage.edit(generalDiscordEmbed);

            if (usernameID in guildDB) {
                try {
                    await member.setNickname(guildDB[usernameID]);
                    delete guildDB[usernameID];
                    await keyv.set(guildID, guildDB);
                } catch (error) {
                    if (generalDiscordEmbed.embed.fields[0].value === "nobody yet")
                        generalDiscordEmbed.embed.fields[0].value = "";
                    generalDiscordEmbed.embed.fields[0].value += "- " + displayName + ": " + error + "\n";
                    await generalDiscordMessage.edit(generalDiscordEmbed);
                }
            }
            else {
                if (generalDiscordEmbed.embed.fields[0].value === "nobody yet")
                    generalDiscordEmbed.embed.fields[0].value = "";
                generalDiscordEmbed.embed.fields[0].value += "- " + displayName + ": didn't had his nickname randomized\n";
                await generalDiscordMessage.edit(generalDiscordEmbed);
            }
        }
        guildDB["locked"] = false;
        await keyv.set(guildID, guildDB);
        generalDiscordEmbed.embed.description = "All the members nickname have been restored!";
        await generalDiscordMessage.edit(generalDiscordEmbed);
    } else if (command) {
        const discordMessage = await message.channel.send("Please specify `!random` or `!restore`.");
        discordMessage.delete(5000);
    }
});

client.login(botToken);