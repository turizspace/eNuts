import type { IProfileContent, Npub } from '@model/nostr'
import { isStr } from '@src/util'
import { cTo } from '@store/utils'
import { Event as NostrEvent } from 'nostr-tools'

/**
 * Get a huge list of available relays
 */
export async function getRelays() {
	const resp = await fetch('https://api.nostr.watch/v1/relays')
	const relays = await resp.json<Promise<string[]>>()
	return relays
}

/**
 * Converts a NIP05 to an URL using name and domain identifier: `https://${domain}/.well-known/nostr.json?name=${name}`
 */
export function nip05toURL(identifier: string) {
	const [name, domain] = identifier.split('@')
	return `https://${domain}/.well-known/nostr.json?name=${name}`
}

/**
 * Converts a NIP-05 identifier to a website URL.
 *
 * @param identifier - The NIP-05 identifier to be converted.
 * @returns The website URL formed from the identifier's domain.
 */
export function nip05toWebsite(identifier: string) {
	const domain = identifier.split('@')[1]
	return `https://${domain}`
}

/**
 * JSON.parse the nostr user profile metadata
 */
export function parseProfileContent(event: NostrEvent) {
	return cTo<IProfileContent>(event.content)
}

/**
 * Filters out the hashtag follows
 */
export function filterFollows(tags: string[][]) {
	return tags.filter(t => t[0] === 'p').map(t => t[1])
}

/**
 * JSON.parse the nostr relays from user
 */
export function parseUserRelays(relays: string) {
	return Object.keys(cTo(relays))
}

/**
 * Truncates the npub of a user
 */
export function truncateNpub(npub: string) {
	return npub.slice(0, 8) + ':' + npub.slice(-8)
}

/**
 * Truncates a string while preserving emojis.
 *
 * @param about - The input string to be truncated.
 * @param maxLength - The maximum length of the truncated string.
 * @returns The truncated string.
 */
export function truncateNostrProfileInfo(str: string, maxLength = 20) {
	if (str.length <= maxLength) { return str }
	const truncated = [...str].slice(0, maxLength).join('')
	return `${truncated}...`
}

/**
 * Retrieves the username from a profile contact object, prioritizing different properties.
 *
 * @param contact - The profile contact object to extract the username from.
 * @returns The extracted username. Returns an empty string if no username is found.
 */
export function getNostrUsername(contact?: IProfileContent) {
	return contact?.displayName || contact?.display_name || contact?.username || contact?.name || ''
}


export function isHex(s: unknown): s is string {
	return isStr(s) && s.length === 64 && /[0-9a-fA-F]{64}/.test(s)
}
export function isNpub(s: unknown): s is Npub {
	return isStr(s) && s.length === 63 && /npub1[023456789acdefghjklmnpqrstuvwxyz]{58}/.test(s)
}