![screenshot](screen.png)

### Preamble
The goal of the project is to try to make something more "lifelike" than a typical chatbot, coupled with simple but nice UI. This is an experimental project. A lot of things are still hardcoded. This README doesn't cover everything.

#### Isn't this an "Agent"?
...Maybe?

![logo](./client/public/logo.svg)

### Features
* Beautiful UI
* Voice control and typing - uses browser's SpeechRecognition API for zero performance impact SST, works great in Chrome, acceptably in Safari MacOS, garbage in Safari iOS. See Settings screen for available commands.
* Streamed Text To Speech - generates TTS phrase by phrase, while inference is running, providing faster TTS without having to wait for inference to complete, or whole message to be parsed and voiced. Works best if inference speed is faster or equal to TTS playback speed. Currently hardcoded to use this https://github.com/longtimegone/StyleTTS2-Sillytavern-api but should be easy to change to something else in code.
* Automatic context shift - chat history will be automatically adjusted in the efficient way, that aims to minimize prompt reevaluation, based on provided `maxContext` in `chatConfig.json`.
* Pinning and pruning messages from context, without deleting them from chat.
* Automatic subprompt direction insertions based on time, randomness, and "affinity"
* Command/shell script execution
* Idle/Heartbeat prompting based on inactivity.
* Time awareness
* Standard features such as editing, rerolling, impersonation, continuation.

### Setup
This project consists of two parts
1. NodeJS server
2. React PWA client

Server acts as a websockets-based middleware between client and llama.cpp server (or whatever else you decide to use).

### Configuration

config files in `./server/config/` are responsible for mostly everything. Client also uses `./server/config/chatConfig.json` to retrieve names, thus, after changing the names, you should rebuild the client if you want names to update in the client as well.

### Notes

This project relies on a few automations running outside of it.
- `./server/data/event.txt` - write an event's name into this file, and Narrator will declare that it has started. Remove it, and Narrator will declare that the event ended. Possible setup is MacOS Shortcuts + Rules.
- `./server/data/notebook.txt` - scratch file that is supposed to be filled by Assistant, everything added here will be "remembered" and always added to the prompt. You can also use external automations to add your calendar here or something. WIP.

### Templates

Available templates in messages:

```
{{system}}
{{user}}
{{char}}
{{narrator}}
{{time}}
{{weekday}}
{{date}}
{{inputPrefix}}
{{inputSuffix}}
{{outputPrefix}}
{{outputSuffix}}
{{systemPrefix}}
{{systemSuffix}}
{{notebook}}
{{persona}} - author of message
{{timestamp}} - time of message
```
Additional templates:

* `directionTemplate: {{direction}}` - direction's content. Directions are dynamic prompts.
* `event(Start/End)Template: {{event}}` - content of the event.txt file

### Running

#### Server
```
cd server
npm i
npm run dev
```

Server also serves the client React PWA from ./dist directory at `localhost:3001`. To rebuild the app.

####
```
cd client
npm i
npm run build
```

### Roadmap
* ~~Add confirmation prompt to purging all unpinned messages from chat (brush icon in top right corner)~~
* ~~Some client UI for managing chat versions - there can only be one active chat at a time, but allowing to switch server to different chat files through client would be nice.~~
* Configurable commands
* Configurable voice control triggers
* Client-configurable names
* Client-configurable avatars
* Light mode
* Improved error handling
