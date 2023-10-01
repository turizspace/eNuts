import { TxtButton } from '@comps/Button'
import Empty from '@comps/Empty'
import useLoading from '@comps/hooks/Loading'
import InputAndLabel from '@comps/InputAndLabel'
import Loading from '@comps/Loading'
import MyModal from '@comps/modal'
import Separator from '@comps/Separator'
import TxtInput from '@comps/TxtInput'
import { isIOS } from '@consts'
import { getMintsBalances } from '@db'
import { l } from '@log'
import type { TAddressBookPageProps } from '@model/nav'
import type { HexKey, IProfileContent, TContact, TUserRelays } from '@model/nostr'
import BottomNav from '@nav/BottomNav'
import TopNav from '@nav/TopNav'
import { getNostrUsername, isHex, isNpub } from '@nostr/util'
import { FlashList, type ViewToken } from '@shopify/flash-list'
import { useKeyboardCtx } from '@src/context/Keyboard'
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
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import ContactPreview from './ContactPreview'
import ProfilePic from './ProfilePic'

/****************************************************************************/
/* State issues will occur while debugging Android and IOS at the same time */
/****************************************************************************/

const marginBottom = isIOS ? 100 : 75
const marginBottomPayment = isIOS ? 25 : 0

// https://github.com/nostr-protocol/nips/blob/master/04.md#security-warning
export default function AddressbookPage({ navigation, route }: TAddressBookPageProps) {
	const { t } = useTranslation([NS.common])
	const { isKeyboardOpen } = useKeyboardCtx()
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
		recent,
		favs,
	} = useNostrContext()
	const [contacts, setContacts] = useState<TContact[]>([])
	const { loading, startLoading, stopLoading } = useLoading()
	const [, setAlreadySeen] = useState<string[]>([])
	const [newNpubModal, setNewNpubModal] = useState(false)
	const [showSearch, setShowSearch] = useState(false)
	const ref = useRef<NostrData>()
	const isSending = route.params?.isMelt || route.params?.isSendEcash

	const toggleSearch = useCallback(() => setShowSearch(prev => !prev), [])

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
			pub = { encoded: clipboard, hex: nip19.decode(clipboard).data || '' }
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
					// l('[onContactsChanged', { _hexArr, added, removed })
					setContacts(prev => {
						l('isArrOfStr(removed) ', isArrOfStr(removed))
						l('removed?.length ', removed?.length)
						l('isArrOfStr(added) ', isArrOfStr(added))
						l('added.length ', added?.length)
						// TODO debug the case where contacts.length remains 0 on initial load
						return [
							...isArrOfStr(removed) && removed.length
								? prev.filter(([hex]) => !removed?.includes(hex))
								: [],
							...isArrOfStr(added) && added.length
								? added.map<TContact>(x => [x, undefined])
								: [],
						].sort((a, b) => {
							const aIsFav = favs.includes(a[0])
							const bIsFav = favs.includes(b[0])
							// a comes before b (a is a favorite)
							if (aIsFav && !bIsFav) { return -1 }
							// b comes before a (b is a favorite)
							if (!aIsFav && bIsFav) { return 1 }
							return 0
						})
					})
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
	const handleContactPress = ({ contact, hex, isUser }: { contact?: IProfileContent, hex?: HexKey, isUser?: boolean }) => {
		// navigate to contact screen
		if (contact && !isUser && !route.params?.isSendEcash && !route.params?.isMelt) {
			navigation.navigate('Contact', {
				contact,
				hex: hex || '',
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
			handleEcash(hex, getNostrUsername(contact))
			return
		}
		if (!userProfile || !contact) {
			openPromptAutoClose({ msg: t('noProfile') })
			return
		}
		// navigate to user profile
		navigation.navigate('Contact', {
			contact: userProfile,
			hex: pubKey.hex,
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
	const handleEcash = (receiverHex?: HexKey, receiverName?: string) => {
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
					receiverHex: receiverHex || '',
					receiverName,
				},
			}
		)
	}

	// user presses the send ecash button
	const handleSend = async ({ hex, name }: { hex: HexKey, name?: string }) => {
		const mintsWithBal = await getMintsBalances()
		const mints = await getCustomMintNames(mintsWithBal.map(m => ({ mintUrl: m.mintUrl })))
		const nonEmptyMints = mintsWithBal.filter(m => m.amount > 0)
		const nostr = {
			senderName: getNostrUsername(userProfile),
			receiverHex: hex,
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

	// l({ loading })
	// l({ nutPub })
	// l({ contactsLength: contacts.length })

	return (
		<View style={[globals(color).container, styles.container]}>
			<TopNav
				screenName={route.params?.isMelt ? t('cashOut') : t('addressBook', { ns: NS.topNav })}
				withBackBtn={isSending}
				nostrProfile={userProfile?.picture}
				showSearch
				toggleSearch={toggleSearch}
				handlePress={() => {
					if (isSending) {
						navigation.goBack()
						return
					}
					navigation.navigate('Contact', {
						contact: userProfile,
						hex: pubKey.hex,
						isUser: true
					})
				}}
			/>
			{loading || (nutPub && !contacts.length) ?
				<View style={styles.loadingWrap}><Loading /></View>
				:
				<>
					{/* user recently used */}
					{recent.length > 0 &&
						<FlashList
							data={recent}
							horizontal
							estimatedItemSize={50}
							keyExtractor={item => item[0]}
							renderItem={({ item }) => (
								<TouchableOpacity onPress={() => void handleSend({
									hex: item[0],
									name: getNostrUsername(item[1])
								})}>
									<ProfilePic
										hex={item[0]}
										size={50}
										uri={item[1]?.picture}
										overlayColor={color.INPUT_BG}
										isVerified={!!item[1]?.nip05?.length}
										isFav={favs.includes(item[0])}
									/>
								</TouchableOpacity>
							)}
						/>
					}
					{/* // TODO search contacts */}
					{showSearch &&
						<View style={{ paddingHorizontal: 20 }}>
							<TxtInput
								placeholder={t('searchContacts')}
								onChangeText={text => l(text)}
								onSubmitEditing={() => l('search')}
								style={{ marginVertical: 10, paddingVertical: 10, paddingHorizontal: 20 }}
							/>
						</View>
					}
					{/* user contacts */}
					{contacts.length > 0 ?
						<View style={[
							styles.contactsWrap,
							{ marginBottom: isKeyboardOpen || route.params?.isMelt || route.params?.isSendEcash ? marginBottomPayment : marginBottom }
						]}>
							<FlashList
								data={contacts}
								estimatedItemSize={70}
								viewabilityConfig={{ minimumViewTime: 500, itemVisiblePercentThreshold: 10 }}
								onViewableItemsChanged={onViewableItemsChanged}
								keyExtractor={item => item[0]}
								renderItem={({ item }) => (
									<ContactPreview
										hex={item[0]}
										contact={item}
										handleContactPress={() => (
											handleContactPress({ hex: item[0], contact: item[1] })
										)}
										handleSend={() => void handleSend({
											hex: item[0],
											name: getNostrUsername(item[1])
										})}
										isPayment={route.params?.isMelt || route.params?.isSendEcash}
										isFav={favs.includes(item[0])}
									/>
								)}
								ItemSeparatorComponent={() => (
									<Separator style={[styles.contactSeparator, { borderColor: color.DARK_BORDER }]} />
								)}
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
			{!isKeyboardOpen && !route.params?.isMelt && !route.params?.isSendEcash &&
				<BottomNav navigation={navigation} route={route} />
			}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 100
	},
	loadingWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 100,
	},
	cancel: {
		marginTop: 25,
		marginBottom: 10
	},
	contactsWrap: {
		flex: 1,
	},
	contactSeparator: {
		marginHorizontal: 20,
		marginVertical: -10,
	},
})
