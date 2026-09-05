import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core'
import type { SermonNotesType, VideoMetaType } from '@/app/types'

/**
 * One row per account. `tokenBalance` is the spendable credit — 1 token buys
 * one video-to-notes conversion — and is only ever moved by the guarded
 * statements in `app/lib/entitlement.ts`, never by a read-modify-write.
 */
export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		/** Always stored lowercased and trimmed; see `normalizeEmail`. */
		email: text('email').notNull(),
		passwordHash: text('password_hash').notNull(),
		stripeCustomerId: text('stripe_customer_id'),
		/**
		 * The card kept on file, so every purchase after the first is one tap.
		 * Brand and last four are mirrored here to spare `/api/me` a round trip
		 * to Stripe on every page load.
		 */
		stripePaymentMethodId: text('stripe_payment_method_id'),
		cardBrand: text('card_brand'),
		cardLast4: text('card_last4'),
		tokenBalance: integer('token_balance').notNull().default(0),
		/**
		 * Carried over from the device that signed up, so making a second account
		 * in the same browser does not hand out a second free video.
		 */
		freeVideoUsed: boolean('free_video_used').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	table => [uniqueIndex('users_email_key').on(table.email)],
)

/**
 * An anonymous browser, identified by the signed `sn_device` cookie. The id is
 * minted in `proxy.ts`; the row appears the first time that device asks the
 * server for something that costs a video.
 */
export const devices = pgTable('devices', {
	id: uuid('id').primaryKey(),
	freeVideoUsed: boolean('free_video_used').notNull().default(false),
	freeVideoUsedAt: timestamp('free_video_used_at', { withTimezone: true }),
	linkedUserId: uuid('linked_user_id').references(() => users.id, {
		onDelete: 'set null',
	}),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

/**
 * Server-side sessions. The cookie carries a random token; only its SHA-256
 * lands here, so a leaked database dump cannot be replayed as a login.
 */
export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	table => [index('sessions_user_id_idx').on(table.userId)],
)

/**
 * One row per Stripe payment attempt. The unique payment intent id is what
 * makes token granting idempotent across the inline confirm and the webhook —
 * whichever arrives first claims the row, the other is a no-op.
 */
export const transactions = pgTable(
	'transactions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		amountCents: integer('amount_cents').notNull(),
		tokensGranted: integer('tokens_granted').notNull(),
		stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
		/** 'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed' */
		status: text('status').notNull().default('pending'),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	table => [
		uniqueIndex('transactions_payment_intent_key').on(
			table.stripePaymentIntentId,
		),
		index('transactions_user_id_idx').on(table.userId),
	],
)

/**
 * The audit ledger: what was spent, on which video, and whether the pipeline
 * later failed and handed it back.
 */
export const conversions = pgTable('conversions', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	deviceId: uuid('device_id'),
	videoId: text('video_id').notNull(),
	/** 'free' | 'token' */
	source: text('source').notNull(),
	refunded: boolean('refunded').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

export type UserRowType = typeof users.$inferSelect
export type DeviceRowType = typeof devices.$inferSelect

/**
 * The notes cache, keyed by YouTube video id and shared across every account.
 * A sermon is only ever transcribed and written up once; everyone after that is
 * served from here.
 *
 * `notesVersion` is the escape hatch. The moment the prompt or the notes schema
 * changes, every row here is stale or the wrong shape — a mismatch reads as a
 * cache miss and regenerates, rather than serving something malformed.
 */
export const videoNotes = pgTable('video_notes', {
	videoId: text('video_id').primaryKey(),
	notes: jsonb('notes').$type<SermonNotesType>().notNull(),
	meta: jsonb('meta').$type<VideoMetaType>(),
	notesVersion: integer('notes_version').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

/**
 * What an account owns. Deliberately carries no foreign key to `video_notes`:
 * an entry is written the moment someone signs up mid-generation, which is
 * before the notes they are waiting on have been cached.
 */
export const libraryEntries = pgTable(
	'library_entries',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		videoId: text('video_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	table => [
		uniqueIndex('library_entries_user_video_key').on(
			table.userId,
			table.videoId,
		),
		index('library_entries_user_id_idx').on(table.userId),
	],
)

/**
 * What people tell us, from the footer of any page.
 *
 * Open to signed-out visitors too — the ones most likely to have something
 * blunt to say are the ones who have not signed up. `path` records which screen
 * they were looking at, since "this is confusing" means little without it.
 */
export const feedback = pgTable('feedback', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	deviceId: uuid('device_id'),
	/** 1–5. Enforced in the route; kept loose here so a future scale can differ. */
	rating: integer('rating').notNull(),
	comment: text('comment'),
	path: text('path'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})
