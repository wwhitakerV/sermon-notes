import { NextResponse } from 'next/server'
import { z } from 'zod'
import { currentAdmin } from '@/app/lib/admin'
import { isNoTrack, setNoTrack } from '@/app/lib/analytics/no-track'

const bodySchema = z.object({ on: z.boolean() })

/** Turns this browser's exclusion on or off. Admins only. */
export async function POST(request: Request) {
	if (!(await currentAdmin())) {
		// A 404 like the admin pages, so the address gives nothing away.
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))

	if (!parsed.success) {
		return NextResponse.json({ error: 'Expected { on }' }, { status: 400 })
	}

	await setNoTrack(parsed.data.on)

	return NextResponse.json({ on: await isNoTrack() })
}
