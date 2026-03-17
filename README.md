This bot is created specifically for managing functionality in a private server I couldn't achieve with existing bots.

## Server Setup
* On the droplet starting it for the first time (if the server hosting ever changed), run `npm run start`, then `pm2 save` and `pm2 startup`
* If changes have been made, connect to the server and run `git pull` and `npm run restart`
* When connecting to a server, if I have to ever do that again, it needs the following scopes:
  * bot
  * application.commands
* and the following permissions:
  * manage roles
  * view channels
  * moderate members
  * send messages
  * create public threads
  * create private threads
  * send messages in threads
  * manage messages
  * manage threads
  * read message history
  * bypass slowmode

## Functionality

### Auto-Spoiler Requirement
* Auto spoiler can be turned on in a given channel using /enable-spoiler-requirement or /disable-spoiler-requirement (at this time the channel IDs are just stored in a JSON file)
* The bot will begin checking messages with images in that channel - if any were not marked as spoilers, the bot replies with a warning message and deletes the original message/image. 

### Old Image Deletion
* Old image deletion will soon also be a toggleable automatic functionality in any given channel to run on a schedule (atm it is just a slash command)
* This function steps through messages looking for images and deletes them. You can pass an age to the command otherwise it defaults to 7 days ago and will delete all old messages up to that point.
* When the command runs, it records the id of the last message it reviews older than the age. This ensures that later runs will not have to review older messages which it already sifted through, preventing exponential increase of run time