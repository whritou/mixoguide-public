import { renderToBuffer } from '@react-pdf/renderer'
import { plannedCollectionService } from '@/services/planned-collection.service'
import { withUser } from '@/middlewares/withAuth'
import { rateLimit } from '@/lib/rateLimit'
import { env } from '@/lib/env'
import { GroceryListDocument } from '@/lib/pdf/GroceryListDocument'

export const runtime = 'nodejs'

function safeFilename(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'shopping-list'
}

export const GET = withUser(async (req, { params }, session) => {
    await rateLimit('pdf-export', req, session)

    const { id } = await params
    const collection = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(collection, session.user.id, session.user.role === 'ADMIN')

    const items = await plannedCollectionService.getGroceryList(id, session.user.id)

    const pdf = await renderToBuffer(
        <GroceryListDocument
            collectionTitle={collection.title}
            plannedFor={collection.plannedFor}
            location={collection.location}
            items={items}
            siteUrl={env.NEXT_PUBLIC_BASE_URL}
        />,
    )

    return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename(collection.title)}-shopping-list.pdf"`,
            'Cache-Control':       'private, no-store',
        },
    })
})
