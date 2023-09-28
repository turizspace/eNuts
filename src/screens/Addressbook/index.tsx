import { TxtButton } from '@comps/Button'
import Empty from '@comps/Empty'
import useLoading from '@comps/hooks/Loading'
import InputAndLabel from '@comps/InputAndLabel'
import Loading from '@comps/Loading'
import MyModal from '@comps/modal'
import Separator from '@comps/Separator'
import { isIOS } from '@consts'
import { getMintsBalances } from '@db'
import { l } from '@log'
import type { TAddressBookPageProps } from '@model/nav'
import type { IProfileContent, TContact, TUserRelays } from '@model/nostr'
import BottomNav from '@nav/BottomNav'
import TopNav from '@nav/TopNav'
import { defaultRelays } from '@nostr/consts'
import { getNostrUsername, isHex, isNpub } from '@nostr/util'
import { FlashList, type ViewToken } from '@shopify/flash-list'
import { useNostrContext } from '@src/context/Nostr'
import { usePromptContext } from '@src/context/Prompt'
import { useThemeContext } from '@src/context/Theme'
import { NS } from '@src/i18n'
import { NostrData } from '@src/nostr/NostrData'
import { secureStore, store } from '@store'
import { SECRET, STORE_KEYS } from '@store/consts'
import { getCustomMintNames } from '@store/mintStore'
import { globals } from '@styles'
import { getStrFromClipboard, isArrOfStr, openUrl, uniq } from '@util'
import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'

import ContactPreview from './ContactPreview'

/****************************************************************************/
/* State issues will occur while debugging Android and IOS at the same time */
/****************************************************************************/

const marginBottom = isIOS ? 100 : 75
const marginBottomPayment = isIOS ? 25 : 0

// https://github.com/nostr-protocol/nips/blob/master/04.md#security-warning
export default function AddressbookPage({ navigation, route }: TAddressBookPageProps) {
	const { t } = useTranslation([NS.common])
	const { openPromptAutoClose } = usePromptContext()
	const { color } = useThemeContext()
	const {
		nutPub,
		setNutPub,
		pubKey,
		setPubKey,
		userProfile,
		setUserProfile,
		userRelays,
		setUserRelays,
	} = useNostrContext()
	const [contacts, setContacts] = useState<TContact[]>([])
	const { loading, startLoading, stopLoading } = useLoading()
	const [, setAlreadySeen] = useState<string[]>([])
	const [newNpubModal, setNewNpubModal] = useState(false)
	const ref = useRef<NostrData>()
	const isSending = route.params?.isMelt || route.params?.isSendEcash

	// check if user has nostr data saved previously
	useEffect(() => {
		startLoading()
		void (async () => {
			const [storedNPub, storedPubKeyHex, storedUserRelays] = await Promise.all([
				store.get(STORE_KEYS.npub),
				store.get(STORE_KEYS.npubHex),
				store.getObj<TUserRelays>(STORE_KEYS.relays),
			])
			// user has no nostr data yet
			if (!storedNPub || !storedPubKeyHex) {
				setNewNpubModal(true)
				stopLoading()
				return
			}
			// user has nostr data, set states
			setPubKey({ encoded: storedNPub || '', hex: storedPubKeyHex || '' })
			setUserRelays(storedUserRelays || [])
			initNostr(storedPubKeyHex)
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// handle npub input field (pressing paste label)
	const handleInputLabelPress = async () => {
		// clear input
		if (pubKey.encoded.length) {
			setPubKey({ encoded: '', hex: '' })
			return
		}
		startLoading()
		setNewNpubModal(false)
		// paste from clipboard
		const clipboard = await getStrFromClipboard()
		if (!clipboard) {
			stopLoading()
			return
		}
		let pub = { encoded: '', hex: '' }
		// check if is npub
		if (isNpub(clipboard)) {
			pub = { encoded: clipboard, hex: nip19.decode(clipboard).data  || '' }
			setPubKey(pub)
			// start initialization of nostr data
			await handleNewNpub(pub)
			return
		}
		try {
			if (isHex(clipboard)) {
				const encoded = nip19.npubEncode(clipboard)
				pub = { encoded, hex: clipboard }
				setPubKey(pub)
			}
		} catch (e) {
			openPromptAutoClose({ msg: t('invalidPubKey') })
			stopLoading()
			return
		}
		// start initialization of nostr data
		await handleNewNpub(pub)
	}

	// handle new pasted npub and initialize nostr data
	const handleNewNpub = async (pub: { encoded: string, hex: string }) => {
		// generate new secret key
		const sk = generatePrivateKey() // `sk` is a hex string
		const pk = getPublicKey(sk)		// `pk` is a hex string
		setNutPub(pk)
		await Promise.allSettled([
			store.set(STORE_KEYS.npub, pub.encoded), 	// save nostr encoded pubKey
			store.set(STORE_KEYS.npubHex, pub.hex),		// save nostr hex pubKey
			store.set(STORE_KEYS.nutpub, pk),			// save enuts hex pubKey
			secureStore.set(SECRET, sk)					// save nostr secret generated by enuts for nostr DM interactions
		])
		initNostr(pub.hex)
	}

	// gets nostr data from cache or relay
	const initNostr = useCallback((hex: string) => {
		if (!hex || (userProfile && contacts.length)) {
			l('no hex or user data already available')
			stopLoading()
			return
		}
		// create new class instance if there is none or if there is a new hex
		if (!ref?.current?.hex || hex !== ref.current.hex) {
			ref.current = new NostrData(hex, {
				onUserMetadataChanged: p => setUserProfile(p),
				// note: creating a new state each event can cause wrong rendering of contacts metadata due to the flashlist viewport event?
				onContactsChanged: (_hexArr, added, removed) => {
					l('[onContactsChanged', { _hexArr, added, removed })
					setContacts(prev => [
						...isArrOfStr(removed) && removed?.length
							? prev.filter(([hex]) => !removed?.includes(hex))
							: [],
						...isArrOfStr(added) && added.length
							? added.map<TContact>(x => [x, undefined])
							: [],
					])
				},
				onProfileChanged: profile => {
					setContacts(prev => prev.map(x => x[0] === profile?.[0] ? profile : x))
				},
				userRelays
			})
		}
		stopLoading()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Gets metadata from cache or relay for contact in viewport
	const setMetadata = useCallback((item: TContact) => {
		// all profile data already available
		if (item[0] && item[1]) { return }
		const hex = item[0]
		l({ itemInSetMetadata: item })
		void ref?.current?.setupMetadataSub(hex)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// checks and saves already seen items to avoid multiple data fetch. Otherwise gets metadata from cache or relay
	const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
		setAlreadySeen(prev => {
			for (let i = 0; i < viewableItems.length; i++) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const { item }: { item: TContact } = viewableItems[i]
				if (!prev.includes(item[0])) { void setMetadata(item) }
			}
			return uniq([...prev, ...viewableItems.map((v: { item: TContact }) => v.item[0])])
		})
	}, [setMetadata])

	// user opens contact screen or proceeds with a payment related action
	const handleContactPress = ({ contact, npub, isUser }: { contact?: IProfileContent, npub?: string, isUser?: boolean }) => {
		// navigate to contact screen
		if (contact && !isUser && !route.params?.isSendEcash && !route.params?.isMelt) {
			navigation.navigate('Contact', {
				contact,
				npub: npub || '',
				isUser,
				userProfile
			})
			return
		}
		// user is in payment process
		// user wants to melt
		if (route.params?.isMelt) {
			handleMelt(contact)
			return
		}
		// user wants to send ecash
		if (!isUser && route.params?.isSendEcash) {
			handleEcash(npub, getNostrUsername(contact))
			return
		}
		if (!userProfile || !contact) {
			openPromptAutoClose({ msg: t('noProfile') })
			return
		}
		// navigate to user profile
		navigation.navigate('Contact', {
			contact: userProfile,
			npub: pubKey.encoded,
			isUser
		})
	}

	// user is in melting payment process
	const handleMelt = (contact?: IProfileContent) => {
		if (!route.params) { return }
		const { isMelt, mint, balance } = route.params
		// user wants to melt to a contact address
		if (contact) {
			if (!contact.lud16) {
				// melting target contact has no lnurl
				openPromptAutoClose({ msg: 'Receiver has no LNURL' })
				return
			}
			navigation.navigate('selectAmount', { isMelt, lnurl: contact.lud16, mint, balance })
			return
		}
		// user wants to melt to his own lnurl
		if (!userProfile?.lud16) {
			openPromptAutoClose({ msg: t('FoundNoLnurl') })
			return
		}
		navigation.navigate('selectAmount', { isMelt, lnurl: userProfile?.lud16, mint, balance })
	}

	// user is in ecash payment process
	const handleEcash = (receiverNpub?: string, receiverName?: string) => {
		if (!route.params) { return }
		const { mint, balance, isSendEcash } = route.params
		navigation.navigate(
			'selectAmount',
			{
				mint,
				balance,
				isSendEcash,
				nostr: {
					senderName: getNostrUsername(userProfile),
					receiverNpub: (nip19.decode(receiverNpub || '').data || '') as string,
					receiverName,
				},
			}
		)
	}

	// user presses the send ecash button
	const handleSend = async ({ npub, name }: { npub: string, name?: string }) => {
		const mintsWithBal = await getMintsBalances()
		const mints = await getCustomMintNames(mintsWithBal.map(m => ({ mintUrl: m.mintUrl })))
		const nonEmptyMints = mintsWithBal.filter(m => m.amount > 0)
		const nostr = {
			senderName: getNostrUsername(userProfile),
			receiverNpub: npub,
			receiverName: name,
		}
		if (nonEmptyMints.length === 1) {
			navigation.navigate('selectAmount', {
				mint: mints.find(m => m.mintUrl === nonEmptyMints[0].mintUrl) || { mintUrl: 'N/A', customName: 'N/A' },
				isSendEcash: true,
				balance: nonEmptyMints[0].amount,
				nostr,
			})
			return
		}
		navigation.navigate('selectMint', {
			mints,
			mintsWithBal,
			allMintsEmpty: !nonEmptyMints.length,
			isSendEcash: true,
			nostr,
		})
	}

	return (
		<View style={[globals(color).container, styles.container]}>
			<TopNav
				screenName={route.params?.isMelt ? t('cashOut') : t('addressBook', { ns: NS.topNav })}
				withBackBtn={isSending}
				nostrProfile={userProfile?.picture}
				handlePress={() => isSending ? navigation.goBack() : navigation.navigate('Contact', {
					contact: userProfile,
					npub: pubKey.encoded,
					isUser: true
				})}
			/>
			{/* Header */}
			<View style={styles.bookHeader}>
				<ContactsCount count={contacts.length} />
			</View>
			{loading || (nutPub && !contacts.length) ?
				<View style={styles.loadingWrap}>
					<Loading />
				</View>
				:
				<>
					{/* user contacts */}
					{contacts.length > 0 ?
						<View style={[
							globals(color).wrapContainer,
							styles.contactsWrap,
							{ marginBottom: route.params?.isMelt || route.params?.isSendEcash ? marginBottomPayment : marginBottom }
						]}>
							<FlashList
								data={contacts}
								estimatedItemSize={70}
								viewabilityConfig={{
									minimumViewTime: 500,
									itemVisiblePercentThreshold: 10,
								}}
								onViewableItemsChanged={onViewableItemsChanged}
								keyExtractor={item => item[0]}
								renderItem={({ item }) => (
									<ContactPreview
										contact={item}
										handleContactPress={() => handleContactPress({ contact: item[1], npub: nip19.npubEncode(item[0]) })}
										handleSend={() => {
											void handleSend({
												npub: item[0],
												name: getNostrUsername(item[1])
											})
										}}
										isPayment={route.params?.isMelt || route.params?.isSendEcash}
									/>
								)}
								ItemSeparatorComponent={() => <Separator style={[styles.contactSeparator]} />}
							/>
						</View>
						:
						<Empty
							txt={newNpubModal ? '' : t('addOwnLnurl', { ns: NS.addrBook })}
							pressable={!newNpubModal}
							onPress={() => setNewNpubModal(true)}
						/>
					}
				</>
			}
			{/* Add user npub modal */}
			<MyModal
				type='bottom'
				animation='slide'
				visible={newNpubModal}
				close={() => setNewNpubModal(false)}
			>
				<Text style={globals(color).modalHeader}>
					{t('addOwnLnurl', { ns: NS.addrBook })}
				</Text>
				<InputAndLabel
					placeholder='NPUB/HEX'
					setInput={text => setPubKey(prev => ({ ...prev, encoded: text }))}
					value={pubKey.encoded}
					handleLabel={() => void handleInputLabelPress()}
					isEmptyInput={pubKey.encoded.length < 1}
				/>
				<TxtButton
					txt={t('whatsNostr')}
					onPress={() => void openUrl('https://nostr-resources.com/')}
					txtColor={color.TEXT}
					style={[{ paddingTop: 25 }]}
				/>
				<TxtButton
					txt={t('cancel')}
					onPress={() => setNewNpubModal(false)}
					style={[{ paddingTop: 25, paddingBottom: 10, }]}
				/>
			</MyModal>
			{!route.params?.isMelt && !route.params?.isSendEcash && <BottomNav navigation={navigation} route={route} />}
		</View>
	)
}

function ContactsCount({ count }: { count: number }) {
	const { t } = useTranslation([NS.common])
	const { color } = useThemeContext()
	const { userRelays } = useNostrContext()
	return (
		<Text style={[styles.subHeader, { color: color.TEXT_SECONDARY }]}>
			{!count ?
				''
				:
				`${count > 1 ? t('contact_other', { count }) : t('contact_one', { count })} - ${userRelays.length || defaultRelays.length} Relays`
			}
		</Text>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 0
	},
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 100,
	},
	bookHeader: {
		paddingHorizontal: 20,
		marginBottom: 20,
		marginTop: 100,
	},
	subHeader: {
		fontSize: 14,
		fontWeight: '500',
	},
	cancel: {
		marginTop: 25,
		marginBottom: 10
	},
	contactsWrap: {
		flex: 1,
		paddingHorizontal: 0,
	},
	contactSeparator: {
		marginLeft: 80,
		marginVertical: -10,
		marginRight: 20,
	},
})
