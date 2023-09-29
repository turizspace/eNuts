import Copy from '@comps/Copy'
import { LeftArrow } from '@comps/Icons'
import LeaveAppModal from '@comps/LeaveAppModal'
import Txt from '@comps/Txt'
import { getMintsBalances } from '@db'
import type { IContactPageProps } from '@model/nav'
import { getNostrUsername, truncateNpub } from '@nostr/util'
import { useNostrContext } from '@src/context/Nostr'
import { usePromptContext } from '@src/context/Prompt'
import { useThemeContext } from '@src/context/Theme'
import { NS } from '@src/i18n'
import { getCustomMintNames } from '@store/mintStore'
import { globals, highlight as hi, mainColors } from '@styles'
import { nip19 } from 'nostr-tools'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import ProfilePic from '../ProfilePic'
import Username from '../Username'
import ProfileBanner from './Banner'
import Lud from './Lud'
import NIP05Verified from './NIP05'
import Website from './Website'

export default function ContactPage({ navigation, route }: IContactPageProps) {
	const { contact, hex, isUser, userProfile } = route.params
	const { t } = useTranslation([NS.addrBook])
	const { pubKey } = useNostrContext()
	const { color, highlight } = useThemeContext()
	const [visible, setVisible] = useState(false)
	const closeModal = useCallback(() => setVisible(false), [])
	const [url, setUrl] = useState('')
	const { openPromptAutoClose } = usePromptContext()

	const handlePress = (url: string) => {
		if (url === 'lightning://') {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			openPromptAutoClose({ msg: `⚠️\n\n${t('zapSoon', { ns: NS.common })}\n\n⚡👀` })
			return
		}
		setVisible(true)
		setUrl(url)
	}

	// start sending ecash via nostr
	const handleSend = async () => {
		const mintsWithBal = await getMintsBalances()
		const mints = await getCustomMintNames(mintsWithBal.map(m => ({ mintUrl: m.mintUrl })))
		const nonEmptyMints = mintsWithBal.filter(m => m.amount > 0)
		const nostr = {
			senderName: getNostrUsername(userProfile),
			receiverHex: hex,
			receiverName: getNostrUsername(contact),
		}
		// TODO this could potentially written in shorter form
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
			<TouchableOpacity
				style={styles.backBtn}
				onPress={() => navigation.goBack()}
			>
				<LeftArrow color={mainColors.WHITE} />
			</TouchableOpacity>
			{/* Contact pictures overview */}
			<ProfileBanner hex={hex} uri={contact?.banner} />
			<View style={styles.profilePicContainer}>
				<View style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden' }}>
					<ProfilePic
						hex={hex}
						uri={contact?.picture}
						size={100}
						isUser={isUser}
					/>
				</View>
				{!isUser &&
					<TouchableOpacity
						style={[styles.sendEcash, { backgroundColor: hi[highlight] }]}
						onPress={() => void handleSend()}
					>
						<Txt txt='Send Ecash' styles={[{ fontWeight: '500', color: mainColors.WHITE }]} />
					</TouchableOpacity>
				}
			</View>
			<View style={styles.contentWrap}>
				{/* username */}
				<Username contact={[hex, contact]} fontSize={24} />
				{/* npub */}
				<View style={styles.npubWrap}>
					<Txt
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						txt={`${isUser ? t('enutsPub', { ns: NS.common }) : ''}${truncateNpub(isUser ? pubKey.encoded : nip19.npubEncode(hex))}`}
						styles={[styles.npub, { color: color.TEXT_SECONDARY }]}
					/>
					<Copy txt={isUser ? pubKey.encoded : nip19.npubEncode(hex)} />
				</View>
				{/* tags */}
				<View style={styles.tagsWrap}>
					<NIP05Verified nip05={contact?.nip05} onPress={handlePress} />
					<Website website={contact?.website} onPress={handlePress} />
					<Lud lud16={contact?.lud16} lud06={contact?.lud06} onPress={handlePress} />
				</View>
				{/* about */}
				{contact?.about && contact.about.length > 0 &&
					<Txt txt={contact.about} styles={[styles.about]} />
				}
			</View>
			<LeaveAppModal url={url} visible={visible} closeModal={closeModal} />
		</View >
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 0
	},
	backBtn: {
		backgroundColor: 'rgba(0, 0, 0, .4)',
		position: 'absolute',
		top: 50,
		left: 20,
		zIndex: 1,
		width: 40,
		height: 40,
		borderRadius: 20,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center'
	},
	profilePicContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		marginTop: -50,
		paddingHorizontal: 20,
	},
	sendEcash: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 50,
		marginBottom: 5,
	},
	contentWrap: {
		paddingTop: 10,
		paddingHorizontal: 20,
	},
	npubWrap: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	npub: {
		fontSize: 14,
	},
	tagsWrap: {
		marginTop: 20,
	},
	about: {
		marginTop: 20,
	},
})