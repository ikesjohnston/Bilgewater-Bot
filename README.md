![alt text](https://i.imgur.com/HRm3cYX.png "I got what you need!")
# Bilgewater-Bot 
Discord bot for displaying World of Warcraft statistics and information.

### Configuration

To configure the bot, create a file in the root project directory named "config.json"

```
{
   "token": "{Your Discord app token}",
   "prefix": "{Character or string to precede recognized commands}", Default - >
   "battlenet": "{Your Battle.net API client ID}",
   "battlenetaccess": "{Your Battle.net API access token}",
   "ownerID": "{Your Discord user ID}",
   "game": "{Game the bot will be listed as playing on launch}" Default - >help
   "googleApi": "{Your Google Custom Search API token}",
   "googleCx": "{Your Google Custom Search CX ID}",
   "searchDelay": "{Time in seconds user must wait to search again}"
}
```

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
