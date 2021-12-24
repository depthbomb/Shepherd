import ms from 'ms';
import { RateLimitManager } from '@sapphire/ratelimits';
import { rateLimitLimit, rateLimitTimeout, ignoredUsers, ignoredRoles, timeOutDuration, announcePunishment, reason } from '../config';

import { Message, GuildMember, Formatters } from 'discord.js';

const manager: RateLimitManager = new RateLimitManager(rateLimitTimeout, rateLimitLimit);

function _exempt(member: GuildMember): boolean {
	const { user: { id }, roles } = member;

	return ignoredUsers.includes(id) || !!roles.cache.findKey(key => ignoredRoles.includes(key.id));
};

export const once = false;
export const handle = async (message: Message) => {
	const { guild, author, system } = message;

	if (!guild || system || author.bot) return;

	const member = await guild.members.fetch(author);

	if (!_exempt(member)) {
		const rateLimitId = `${guild.id}_${author.id}`;
		const rateLimit = manager.acquire(rateLimitId);
		if (rateLimit.limited) {
			const duration = ms(timeOutDuration);
			const date = new Date();
			date.setMilliseconds(date.getMilliseconds() + duration);
			try {
				await member.disableCommunicationUntil(date);

				if (announcePunishment) {
					await message.channel.send(`${member} has been timed out until **${Formatters.time(date, 'F')}**. ${reason ? `\n\n**Reason:** ${reason}` : ''}`);
				}

			} catch (err: any) {
				console.error(err);
				if ('code' in err && err.code === 50013) {
					await message.channel.send('Could not time out user because I don\'t have the proper permission!');
				} else {
					await message.channel.send('Could not time out user. Please check my console for more info.');
				}
			}
		} else {
			rateLimit.consume();
		}
	}
};
