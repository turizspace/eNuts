import { FlashList } from '@shopify/flash-list'
import { useNostrContext } from '@src/context/Nostr'
import { l } from '@src/logger'
import { IProfileContent, TUserRelays } from '@src/model/nostr'
import { NostrData } from '@src/nostr/NostrData'
import { store } from '@src/storage/store'
import { STORE_KEYS } from '@src/storage/store/consts'
import { uniqBy } from '@src/util'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'

import ContactPreview from './ContactPreview'

interface ITestContact extends IProfileContent {
	hex: string
}

export default function TestList() {

	const {
		nutPub,
		setNutPub,
		pubKey,
		setPubKey,
		userProfile,
		setUserProfile,
		userRelays,
		setUserRelays,
		recent,
		favs,
	} = useNostrContext()

	const [contacts, setContacts] = useState<ITestContact[]>([])

	const ref = useRef<NostrData>()

	const handleonEndReached = () => {
		l('end reached')

		// ref.current?.setupMetadataSub2(contacts.map(x => x.hex))
	}

	const initContacts = (hex: string) => {
		if (!ref?.current?.hex || hex !== ref.current.hex) {
			ref.current = new NostrData(hex, {
				onUserMetadataChanged: p => setUserProfile(p),
				// note: creating a new state each event can cause wrong rendering of contacts metadata due to the flashlist viewport event?
				onContactsChanged: hexArr => {
					// l('contacts changed', hexArr)
					ref.current?.setupMetadataSub2([])
				},
				onProfileChanged: profile => {
					// setContacts(prev => prev.map(x => x[0] === profile?.[0] ? profile : x))
					// l('profile changed', profile)
					setContacts(
						prev => uniqBy([...prev, { hex: profile[0], ...profile[1] }], 'hex')
					)
					// l(contacts.length, 'contacts length')
				},
				userRelays
			})

		}
	}
	l(contacts.length, 'contacts length')


	useEffect(() => {
		void (async () => {
			const [storedNPub, storedPubKeyHex, storedUserRelays] = await Promise.all([
				store.get(STORE_KEYS.npub),
				store.get(STORE_KEYS.npubHex),
				store.getObj<TUserRelays>(STORE_KEYS.relays),
			])
			// user has no nostr data yet
			if (!storedNPub || !storedPubKeyHex) {
				l('no nostr data yet')
				// setNewNpubModal(true)
				// stopLoading()
				return
			}
			// user has nostr data, set states
			setPubKey({ encoded: storedNPub || '', hex: storedPubKeyHex || '' })
			setUserRelays(storedUserRelays || [])
			// initNostr(storedPubKeyHex)
			initContacts(storedPubKeyHex)
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<View style={{ flex: 1 }}>
			<FlashList
				data={contacts}
				estimatedItemSize={100}
				keyExtractor={item => item.hex}
				onEndReached={handleonEndReached}
				//onTouchEnd={}
				onEndReachedThreshold={.5}
				renderItem={({ item }) => (
					<ContactPreview
						hex={item.hex}
						contact={[item.hex, item]}
						handleContactPress={() => (
							l('contact press', item)
						)}
						handleSend={() => (
							l('contact send', item)
						)}
					/>
				)}
			/>
		</View>
	)
}