import { PlusIcon, UserIcon } from '@comps/Icons'
import { imgProxy } from '@nostr/consts'
import { useThemeContext } from '@src/context/Theme'
import { l } from '@src/logger'
import { highlight as hi } from '@styles'
import { isStr } from '@util'
import * as Application from 'expo-application'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'

interface INostrImg {
	hex: string
	kind?: 'picture' | 'banner'
	width?: 64 | 192 | 600 | 1200
}

interface IProfilePicProps {
	uri?: string
	size?: number
	isUser?: boolean
	withPlusIcon?: boolean
	overlayColor?: string
}

export default function ProfilePic({ hex, uri, size, isUser, withPlusIcon, overlayColor }: IProfilePicProps & INostrImg) {
	const { color, highlight } = useThemeContext()
	const [isErr, setIsErr] = useState(false)
	const defaultSize = isUser ? 60 : 40
	const circleStyle = {
		width: size || defaultSize,
		height: size || defaultSize,
		borderRadius: size ? size / 2 : defaultSize / 2
	}
	/* useEffect(() => {
		if (!uri || !isUrl(uri)) { return }
		Image.prefetch(`${imgProxy(hex, uri, circleStyle.width, 'picture', 64)}`)
	}) */
	return (
		<>
			{isStr(uri) && uri?.length && !isErr ?
				<Image
					// https://docs.expo.dev/versions/latest/sdk/image/
					cachePolicy='disk'
					onError={(e => {
						l('img err for url', uri, e, `${imgProxy(hex, uri, circleStyle.width, 'picture', 64)}`)
						setIsErr(true)
					})}
					source={{
						uri: `${imgProxy(hex, uri, circleStyle.width, 'picture', 64)}`,
						cacheKey: `${hex}-picture-64-${circleStyle.width}-${encodeURIComponent(uri)}.cachedImg`,
						headers: {
							Referrer: `${Application.applicationName}-${Application.nativeBuildVersion}-${Platform.OS}`
						}
					}}
					transition={200}
					contentFit='cover'
					style={[
						styles.circle,
						styles.img,
						{ overlayColor, marginRight: isUser ? 0 : 10 },
						circleStyle
					]}
				/>
				:
				<View style={[
					styles.circle,
					{
						borderColor: color.BORDER,
						backgroundColor: color.INPUT_BG,
						marginRight: 10,
						...circleStyle
					}
				]}>
					{withPlusIcon ?
						<PlusIcon color={hi[highlight]} />
						:
						<UserIcon width={30} height={30} color={hi[highlight]} />
					}
				</View>
			}
		</>
	)
}

const styles = StyleSheet.create({
	circle: {
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 2,
	},
	img: {
		borderWidth: 0,
	}
})