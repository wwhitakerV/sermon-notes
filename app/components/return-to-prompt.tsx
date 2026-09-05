'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { RETURN_TO, safeReturnTo } from '@/app/lib/return-to'
import { useAccount } from './account-provider'
import { AuthPrompt } from './auth-prompt'
import { Overlay } from './overlay'

/**
 * Picks someone up where they were turned away.
 *
 * Bookmark your notes, come back after the session has expired, and the server
 * sends you here. Without this you would sign in and land on the home page,
 * having to go and find the sermon again.
 */
export function ReturnToPrompt() {
	const params = useSearchParams()
	const router = useRouter()
	const { account, apply } = useAccount()
	const [dismissed, setDismissed] = useState(false)

	const returnTo = safeReturnTo(params.get(RETURN_TO))

	if (!returnTo || account || dismissed) {
		return null
	}

	return (
		<Overlay onDismiss={() => setDismissed(true)}>
			<AuthPrompt
				variant="signin"
				onSuccess={next => {
					apply(next)
					router.replace(returnTo)
				}}
				onDismiss={() => setDismissed(true)}
			/>
		</Overlay>
	)
}
