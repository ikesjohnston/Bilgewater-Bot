![alt text](https://i.imgur.com/HRm3cYX.png "I got what you need!")
# Bilgewater-Bot
Discord bot for displaying World of Warcraft statistics and information.

### Configuration

To configure the bot, create a file in the root project directory named "config.json"

```
{
   "token": "{Your Discord app token}",
   "prefix": "{Character or string to precede recognized commands}", Default - /
   "battlenet": "{Your Battle.net API token}",
   "ownerID": "{Your Discord user ID}",
   "game": "{Game the bot will be listed as playing on launch}" Default - /wow
}
```

### Commands

wow <character> <realm> <region> - Looks up a character and displays some basic stats

setgame - Sets the game that the bot is listed as playing, only the bot owner can use this command
