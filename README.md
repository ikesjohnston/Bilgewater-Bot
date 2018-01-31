![alt text](https://i.imgur.com/HRm3cYX.png "I got what you need!")
# Bilgewater-Bot 
Discord bot for displaying World of Warcraft statistics and information.

### Setup

This project requires Node.js to run.

Because of API request limits, this bot is not currently deployed on a public server. If you want to use it, you'll have to host the bot on your own machine, configure it with your own API tokens, and create a discord app for the bot to run under.

Once you have the project downloaded to the desired working directory, open a command line and install dependencies:

```npm install```

Then run the bot:

```node bot.js```

### Configuration

To configure the bot, create a file in the root project directory named "config.json"

```
{
   "token": "",
   "prefix": "",
   "battlenet": "",
   "battlenetaccess": "",
   "warcraftLogs": "",
   "tsm": "",
   "ownerID": "",
   "game": "",
   "googleApi": "",
   "googleCx": "",
   "searchDelay": ""
}
```
**token:** Your Discord app token\n
**prefix:** Character or string to precede recognized commands, **Default is '>'**
**battlenet**: Your Battle.net API client ID
**battlenetaccess:** Your Battle.net API access token
**warcraftLogs:** Your Warcraft Logs API access token
**tsm:** Your Trade Skill Master API access token
**ownerID:** Your Discord user ID
**game:** Game the bot will be listed as playing on launch, **Default is 'help'**
**googleApi:** Your Google Custom Search API token
**googleCx:** Your Google Custom Search CX ID
**searchDelay:** Time in seconds user must wait to search again
   
### Commands

\>help --- Displays available commands

\>bookmarks --- bookmark up to 10 characters for use with other commands

\>toon --- Looks up a character and displays some basic stats

\>affix --- Displays mythic+ affix details and leaderboards for the current week
   
\>logs --- Get raid or encounter logs for a character

\>setgame --- Sets the game that the bot is listed as playing, only the bot owner can use this command

\>search --- Perform a Wowhead search

\>token --- Look up current WoW token prices

\>price --- Look up current auction prices for an item
