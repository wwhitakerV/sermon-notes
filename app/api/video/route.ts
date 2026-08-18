import { NextRequest, NextResponse } from 'next/server'
import { getVideoMeta } from '@/app/lib/video-meta'
import { extractVideoId } from '@/app/lib/youtube'

export async function GET(req: NextRequest) {
	const url = req.nextUrl.searchParams.get('url')

	if (!url) {
		return NextResponse.json({ error: 'YouTube URL required' }, { status: 400 })
	}

	const videoId = extractVideoId(url)

	if (!videoId) {
		return NextResponse.json(
			{ error: "That doesn't look like a YouTube link." },
			{ status: 400 },
		)
	}

	const meta = await getVideoMeta(videoId)

	if (!meta) {
		return NextResponse.json(
			{ error: 'We could not find that video on YouTube.' },
			{ status: 404 },
		)
	}

	return NextResponse.json(meta)
}
