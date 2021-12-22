import 'source-map-support/register';

import { glob } from 'glob';
import { Client } from 'discord.js';
import { botToken } from './config';
import { resolve, extname, basename } from 'node:path';

const client = new Client({
	shards: 'auto',
	intents: ['GUILDS', 'GUILD_BANS', 'GUILD_MEMBERS', 'GUILD_MESSAGES'],
	partials: ['USER', 'CHANNEL', 'GUILD_MEMBER', 'MESSAGE', 'REACTION'],
	invalidRequestWarningInterval: 100,
	failIfNotExists: false
});

async function initializeEvents() {
	glob('./dist/events/*.js', async (err: any, files: string[]) => {
		if (err) throw new Error(err);
		if (!files.length) throw new Error('No event files found.');
		for (const file of files) {
			const eventFile = resolve(file);
			const eventName = basename(eventFile, extname(eventFile));
			const event = await import(eventFile);
			if (event.once) {
				client.once(eventName, async (...args) => await event.handle(...args));
			} else {
				client.on(eventName, async (...args) => await event.handle(...args));
			}
		}
	});
};

async function login() {
	await client.login(botToken);
};

function shutdown() {
	console.log('Shutting down');
	client?.destroy();
	process.exit(0);
};

function errored(err: any) {
	console.error(err);
	client?.destroy();
	process.exit(1);
};

Promise.all([
	initializeEvents(),
	login()
])
.catch(errored);

process.once('SIGINT', shutdown);
process.once('SIGHUP', shutdown);
process.once('SIGTERM', shutdown);

process.once('uncaughtException', errored);
process.once('unhandledRejection', errored);
