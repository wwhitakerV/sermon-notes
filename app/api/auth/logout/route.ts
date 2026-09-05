import { NextResponse } from 'next/server'
import { accountStateFor } from '@/app/lib/account-state'
import { destroySession } from '@/app/lib/auth/session'

export async function POST() {
	await destroySession()

	return NextResponse.json(accountStateFor(null))
}
