import { Npub } from '@src/model/nostr'
import { isUrl } from '@src/util'

/**
 * Default bootstrap relays
 */
export const defaultRelays = [
	'wss://relay.nostr.band',
	'wss://relay.damus.io',
	'wss://nostr-pub.wellorder.net',
	'wss://nostr.mom',
	'wss://eden.nostr.land',
	'wss://nos.lol',
	'wss://relay.snort.social',
	'wss://nostr-relay.untethr.me',
	'wss://nostr.zebedee.social',
	'wss://offchain.pub',
	'wss://nostr.fmt.wiz.biz',
	'wss://nostr-relay.wlvs.space',
	'wss://relay.realsearch.cc',
	'wss://relay.nostrgraph.net',
	'wss://relay.minds.com/nostr/v1/ws'
]

export const EventKind = {
	Unknown: -1,
	Metadata: 0,
	TextNote: 1,
	RecommendServer: 2,
	ContactList: 3, 			// NIP-02
	DirectMessage: 4, 			// NIP-04
	Deletion: 5, 				// NIP-09
	Repost: 6, 				// NIP-18
	Reaction: 7, 				// NIP-25
	BadgeAward: 8, 			// NIP-58
	SnortSubscriptions: 1000, 	// NIP-XX
	Polls: 6969, 				// NIP-69
	FileHeader: 1063, 			// NIP-94
	Relays: 10002, 			// NIP-65 Relay List Metadata
	Ephemeral: 20_000,
	Auth: 22242, 				// NIP-42
	PubkeyLists: 30000, 		// NIP-51a
	NoteLists: 30001, 			// NIP-51b
	TagLists: 30002, 			// NIP-51c
	Badge: 30009, 				// NIP-58
	ProfileBadges: 30008, 		// NIP-58
	ZapRequest: 9734, 			// NIP 57
	ZapReceipt: 9735, 			// NIP 57
	HttpAuthentication: 27235, // NIP XX - HTTP Authentication
} as const


export const enutsPubkey: Npub = 'npub1dx5q2el8nd4eh3eg9t2e25fd7zuqg7zxz6ldkc3uzgh66ss2yc6st288sj'

/**
 * Regex to match a mnemonic seed
 */
// export const MnemonicRegex = /(\w+)/g

/**
 * NIP06-defined derivation path for private keys
 */
// export const DerivationPath = 'm/44\'/1237\'/0\'/0/0'

/**
 * Websocket re-connect timeout
 */
// export const defaultConnectTimeout = 2000


const PREFIX = 'https://cf-worker-images.enuts.workers.dev'
export function imgProxy(
	hex: string,
	url: string,
	width: number,
	kind: 'picture',
	size: 64 | 192): string
export function imgProxy(
	hex: string,
	url: string,
	width: number,
	kind: 'banner',
	size: 600 | 1200): string
export function imgProxy(
	hex: string,
	url: string,
	width = 40,
	kind: 'picture' | 'banner' = 'picture',
	size: 64 | 192 | 600 | 1200 = 64
): string {
	if (url.startsWith('data:')) { return url }
	if (!isUrl(url)) { return '' }
	return `${PREFIX}/hex/${hex}/${kind}/${size}?_=${encodeURIComponent(url)}&s=${width ?? 40}`
}
