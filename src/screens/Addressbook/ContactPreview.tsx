import { ChevronRightIcon, CopyIcon, ListFavIcon, MenuDotsIcon } from '@comps/Icons'
import Separator from '@comps/Separator'
import Txt from '@comps/Txt'
import type { IProfileContent, TContact } from '@model/nostr'
import { truncateNostrProfileInfo, truncateNpub } from '@nostr/util'
import { useNostrContext } from '@src/context/Nostr'
import { useThemeContext } from '@src/context/Theme'
import { store } from '@store'
import { STORE_KEYS } from '@store/consts'
// import { NS } from '@src/i18n'
import { highlight as hi, mainColors } from '@styles'
import { nip19 } from 'nostr-tools'
// import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import {
	Menu,
	MenuOption,
	MenuOptions,
	MenuTrigger,
} from 'react-native-popup-menu'

import ProfilePic from './ProfilePic'
import Username from './Username'

interface IContactPreviewProps {
	hex: string
	contact: TContact | [string, Partial<IProfileContent>]
	handleContactPress: () => void
	handleSend: () => void
	isPayment?: boolean
	isFav?: boolean
}

export default function ContactPreview({ hex, contact, handleContactPress, handleSend, isPayment, isFav }: IContactPreviewProps) {
	// const { t } = useTranslation([NS.common])
	const { color, highlight } = useThemeContext()
	const { favs, setFavs } = useNostrContext()

	return (
		<View style={[styles.container]}>
			<TouchableOpacity onPress={handleSend} style={styles.colWrap}>
				<ProfilePic
					hex={contact[0]}
					size={50}
					uri={contact[1]?.picture}
					overlayColor={color.INPUT_BG}
					isVerified={!!contact[1]?.nip05?.length}
					isFav={isFav}
				/>
				{contact[1] ?
					<View style={styles.nameWrap}>
						<Username contact={contact} fontSize={16} />
						{contact?.[1]?.nip05 &&
							<Txt
								txt={truncateNostrProfileInfo(contact[1].nip05, 25)}
								styles={[{ color: hi[highlight], fontSize: 12 }]}
							/>
						}
					</View>
					:
					<Txt txt={truncateNpub(nip19.npubEncode(contact[0]))} styles={[{ fontWeight: '500' }]} />
				}
			</TouchableOpacity>
			{contact[1] ?
				isPayment ?
					<ChevronRightIcon width={16} height={16} color={color.TEXT} />
					:
					<Menu>
						<MenuTrigger><MenuDotsIcon color={color.TEXT} /></MenuTrigger>
						<MenuOptions
							customStyles={{
								optionsContainer: {
									backgroundColor: color.INPUT_BG,
									borderRadius: 10,
								},
							}}
						>
							<MenuOption
								onSelect={() => {
									// TODO re-render contacts
									let newFavs: string[] = []
									if (favs.includes(hex)) {
										setFavs(prev => {
											newFavs = prev.filter(fav => fav !== hex)
											return newFavs
										})
									} else {
										setFavs(prev => {
											newFavs = [...prev, hex]
											return newFavs
										})
									}
									void store.setObj(STORE_KEYS.favs, newFavs)
								}}
							>
								<View style={styles.optWrap}>
									{/* // TODO translate / remove fav */}
									<Txt txt={isFav ? 'Remove favorite' : 'Favorite'} />
									<ListFavIcon width={20} height={20} color={isFav ? color.TEXT : mainColors.STAR} />
								</View>
							</MenuOption>
							<Separator />
							<MenuOption onSelect={handleContactPress} >
								<View style={styles.optWrap}>
									{/* // TODO translate */}
									<Txt txt='Show profile' />
									<ChevronRightIcon width={16} height={16} color={color.TEXT} />
								</View>
							</MenuOption>
							<Separator />
							<MenuOption onSelect={() => alert('Copy npub')} >
								<View style={styles.optWrap}>
									{/* // TODO translate */}
									<Txt txt='Copy npub' />
									<CopyIcon width={18} height={18} color={color.TEXT} />
								</View>
							</MenuOption>
						</MenuOptions>
					</Menu>
				:
				null
			}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 20,
	},
	colWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '70%'
	},
	nameWrap: {
		width: '100%'
	},
	optWrap: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 10
	},
})