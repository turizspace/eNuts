import { ListFavIcon, ListVerifiedIcon, UserIcon } from '@comps/Icons'
import { imgProxy } from '@nostr/consts'
import { useThemeContext } from '@src/context/Theme'
// import { l } from '@src/logger'
import { highlight as hi, mainColors } from '@styles'
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
	overlayColor?: string
	isFav?: boolean
	isVerified?: boolean
}

export default function ProfilePic({
	hex,
	uri,
	size,
	isUser,
	overlayColor,
	isFav,
	isVerified
}: IProfilePicProps & INostrImg) {
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
		<View style={{ position: 'relative', marginRight: isUser ? 0 : 10 }}>
			{isStr(uri) && uri?.length && !isErr ?
				<Image
					// https://docs.expo.dev/versions/latest/sdk/image/
					cachePolicy='disk'
					onError={(_e => {
						// l('img err for url', uri, e, `${imgProxy(hex, uri, circleStyle.width, 'picture', 64)}`)
						setIsErr(true)
					})}
					source={{
						uri: `${imgProxy(hex, uri, circleStyle.width, 'picture', 64)}`,
						// cacheKey: `${hex}-picture-64-${circleStyle.width}-${encodeURIComponent(uri)}.cachedImg`,
						headers: {
							Referrer: `${Application.applicationName}-${Application.nativeBuildVersion}-${Platform.OS}`
						}
					}}
					transition={200}
					contentFit='cover'
					style={[
						styles.circle,
						styles.img,
						{ overlayColor },
						circleStyle
					]}
				/>
				:
				<View style={[
					styles.circle,
					{
						borderColor: color.BORDER,
						backgroundColor: color.INPUT_BG,
						...circleStyle
					}
				]}>
					<UserIcon width={isUser ? 15 : 30} height={isUser ? 15 : 30} color={hi[highlight]} />
				</View>
			}
			{!isUser && isVerified &&
				<View style={[styles.imgIcon, styles.right]}>
					<ListVerifiedIcon width={14} height={14} />
				</View>
			}
			{!isUser && isFav &&
				<View style={[styles.imgIcon, styles.left]}>
					<ListFavIcon width={14} height={14} color={mainColors.STAR} />
				</View>
			}
		</View>
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
	},
	imgIcon: {
		position: 'absolute',
		bottom: 0,
		zIndex: 2,
	},
	right: {
		right: 0,
	},
	left: {
		left: 0,
	}
})