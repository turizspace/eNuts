import { HexKey } from '@model/nostr'
import { imgProxy } from '@nostr/consts'
import { isStr } from '@util'
import * as Application from 'expo-application'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'

export default function ProfileBanner({ hex, uri }: { hex: HexKey, uri?: string }) {
	const [isErr, setIsErr] = useState(false)
	return (
		<View style={styles.imgWrap}>
			{isStr(uri) && uri?.length > 0 && !isErr ?
				<Image
					onError={(_e => setIsErr(true))}
					source={{
						uri: `${imgProxy(hex, uri, Dimensions.get('window').width, 'banner', 600)}`,
						cacheKey: `${hex}-banner-600-${ Dimensions.get('window').width}-${encodeURIComponent(uri)}.cachedImg`,
						headers: {
							Referrer: `${Application.applicationName}-${Application.nativeBuildVersion}-${Platform.OS}`
						}
					}
					}
					cachePolicy='disk'
					transition={200}
					contentFit='cover'
					style={styles.banner}
				/>
				:
				<Image
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					source={require('@assets/mixed_forest.png')}
					contentFit='cover'
					style={styles.defaultBanner}
				/>
			}
		</View>
	)
}

const styles = StyleSheet.create({
	imgWrap: {
		width: '100%',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	banner: {
		width: '100%',
		height: 200,
		opacity: 1,
		// marginTop: 10
	},
	defaultBanner: {
		width: undefined,
		height: 350,
		opacity: .4,
		marginTop: -100
	}
})