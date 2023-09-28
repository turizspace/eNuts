import { l } from '@log'
import type { IProfileContent, TContact } from '@model/nostr'
import { store } from '@store'
import { STORE_KEYS } from '@store/consts'
import { getRedeemdedSigs } from '@store/nostrDms'
import { createContext, useContext, useEffect, useState } from 'react'

const useNostr = () => {
	const [nutPub, setNutPub] = useState('')
	const [pubKey, setPubKey] = useState({ encoded: '', hex: '' })
	const [userProfile, setUserProfile] = useState<IProfileContent | undefined>()
	const [userRelays, setUserRelays] = useState<string[]>([])
	const [favs, setFavs] = useState<string[]>([])
	const [recent, setRecent] = useState<TContact[]>([])
	const [claimedEvtIds, setClaimedEvtIds] = useState<string[]>([])

	// init
	useEffect(() => {
		void (async () => {
			try {
				const [nutpub, redeemed, nostrFavs, nostrRecent] = await Promise.all([
					// user enuts pubKey
					store.get(STORE_KEYS.nutpub),
					// already claimed ecash from DM: stored event signatures
					getRedeemdedSigs(),
					store.getObj<string[]>(STORE_KEYS.favs),
					store.getObj<TContact[]>(STORE_KEYS.recent),
				])
				setNutPub(nutpub || '')
				setClaimedEvtIds(redeemed)
				setFavs(nostrFavs || [])
				setRecent(nostrRecent || [])
			} catch (e) {
				l(e)
			}
		})()
	}, [])

	return {
		nutPub,
		setNutPub,
		pubKey,
		setPubKey,
		userProfile,
		setUserProfile,
		userRelays,
		setUserRelays,
		recent,
		setRecent,
		favs,
		setFavs,
		claimedEvtIds,
		setClaimedEvtIds
	}
}
type useNostrType = ReturnType<typeof useNostr>
const NostrContext = createContext<useNostrType>({
	nutPub: '',
	setNutPub: () => l(''),
	pubKey: { encoded: '', hex: '' },
	setPubKey: () => l(''),
	userProfile: {
		about: '',
		banner: '',
		displayName: '',
		display_name: '',
		lud06: '',
		lud16: '',
		name: '',
		nip05: '',
		picture: '',
		username: '',
		website: '',
	},
	setUserProfile: () => l(''),
	userRelays: [],
	setUserRelays: () => l(''),
	recent: [],
	setRecent: () => l(''),
	favs: [],
	setFavs: () => l(''),
	claimedEvtIds: [],
	setClaimedEvtIds: () => l(''),
})

export const useNostrContext = () => useContext(NostrContext)

export const NostrProvider = ({ children }: { children: React.ReactNode }) => (
	<NostrContext.Provider value={useNostr()} >
		{children}
	</NostrContext.Provider>
)