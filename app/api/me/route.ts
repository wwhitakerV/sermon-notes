import { NextResponse } from 'next/server'
import { readAccountState } from '@/app/lib/account-state'

/** Everything the UI needs to know about who is asking. */
export async function GET() {
	return NextResponse.json(await readAccountState())
}
