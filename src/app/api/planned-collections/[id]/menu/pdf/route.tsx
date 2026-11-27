import { renderToBuffer } from '@react-pdf/renderer'
import { plannedCollectionService } from '@/services/planned-collection.service'
import { withUser } from '@/middlewares/withAuth'
import { rateLimit } from '@/lib/rateLimit'
import { PartyMenuDocument } from '@/lib/pdf/PartyMenuDocument'

export const runtime = 'nodejs'

function safeFilename(name: string): string {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'party'
}

export const GET = withUser(async (req, { params }, session) => {
    await rateLimit('pdf-export', req, session)

    const { id } = await params
    const collection = await plannedCollectionService.getById(id)
    plannedCollectionService.assertOwnership(collection, session.user.id, session.user.role === 'ADMIN')

    const cocktails = collection.cocktails.map(({ cocktail }) => ({
        name: cocktail.name,
        ingredients: cocktail.ingredients
            .filter(line => !line.optional)
            .map(line => line.ingredient.name),
    }))

    const pdf = await renderToBuffer(
        <PartyMenuDocument title={collection.title} plannedFor={collection.plannedFor} cocktails={cocktails} />,
    )

    return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename(collection.title)}-menu.pdf"`,
            'Cache-Control':       'private, no-store',
        },
    })
})
