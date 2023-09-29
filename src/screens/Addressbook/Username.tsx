import Txt from '@comps/Txt'
import type { TContact } from '@model/nostr'
import { getNostrUsername, truncateNostrProfileInfo, truncateNpub } from '@nostr/util'
import { nip19 } from 'nostr-tools'
import { StyleSheet } from 'react-native'

interface IUsernameProps {
	contact?: TContact
	fontSize?: number
}

export default function Username({ contact, fontSize }: IUsernameProps) {
	const txtStyle = [styles.username, { fontSize: fontSize || 18 }]
	const n = getNostrUsername(contact?.[1])
	if (n?.length) {
		return <Txt
			txt={truncateNostrProfileInfo(n)}
			styles={txtStyle}
		/>
	}
	if (!contact?.[0].length) { return 'N/A' }
	return <Txt
		txt={truncateNpub(nip19.npubEncode(contact[0]))}
		styles={txtStyle}
	/>
}

const styles = StyleSheet.create({
	username: {
		fontWeight: '500'
	}
})