import { ChevronRightIcon, MenuDotsIcon, UserIcon } from '@comps/Icons'
import Separator from '@comps/Separator'
import Txt from '@comps/Txt'
import type { IProfileContent, TContact } from '@model/nostr'
import { truncateNostrProfileInfo, truncateNpub } from '@nostr/util'
import { useThemeContext } from '@src/context/Theme'
// import { NS } from '@src/i18n'
import { highlight as hi } from '@styles'
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
	contact: TContact | [string, Partial<IProfileContent>]
	handleContactPress: () => void
	handleSend: () => void
	isPayment?: boolean
}

export default function ContactPreview({ contact, handleContactPress, handleSend, isPayment }: IContactPreviewProps) {
	// const { t } = useTranslation([NS.common])
	const { color, highlight } = useThemeContext()

	return (
		<TouchableOpacity
			onPress={() => {
				if (isPayment) {
					handleContactPress()
					return
				}
				handleSend()
			}}
			disabled={!isPayment}
			style={[
				styles.container
			]}
		>
			<TouchableOpacity
				onPress={handleContactPress}
				disabled={isPayment}
				style={styles.colWrap}
			>
				<ProfilePic
					hex={contact[0]}
					size={50}
					uri={contact[1]?.picture}
					overlayColor={color.INPUT_BG}
				/>
				{contact[1] ?
					<View style={styles.nameWrap}>
						<Username
							displayName={contact[1].displayName}
							display_name={contact[1].display_name}
							username={contact[1].username}
							name={contact[1].name}
							npub={truncateNpub(nip19.npubEncode(contact[0]))}
							fontSize={16}
						/>
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
			{isPayment && contact[1] ?
				<ChevronRightIcon width={16} height={16} color={color.TEXT} />
				:
				!isPayment && contact[1] ?
					<Menu>
						<MenuTrigger>
							<MenuDotsIcon color={color.TEXT} />
						</MenuTrigger>
						<MenuOptions
							customStyles={{
								optionsContainer: {
									backgroundColor: color.INPUT_BG,
									borderRadius: 10,
								},
							}}
						>
							<MenuOption onSelect={() => alert('Favorite')} >
								<View style={styles.optWrap}>
									<Txt txt='Favorite' />
									<UserIcon width={18} height={18} color={color.TEXT} />
								</View>
							</MenuOption>
							<Separator />
							<MenuOption onSelect={handleContactPress} >
								<View style={styles.optWrap}>
									<Txt txt='See profile' />
									<UserIcon width={18} height={18} color={color.TEXT} />
								</View>
							</MenuOption>
							<Separator />
							<MenuOption onSelect={() => alert('Copy npub')} >
								<View style={styles.optWrap}>
									<Txt txt='Copy npub' />
									<UserIcon width={18} height={18} color={color.TEXT} />
								</View>
							</MenuOption>
							{/* <MenuOption onSelect={() => alert('Not called')} disabled text='Disabled' /> */}
						</MenuOptions>
					</Menu>
					:
					null
			}
		</TouchableOpacity>
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