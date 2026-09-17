import { renderToBuffer } from '@react-pdf/renderer'
import { cocktailService } from '@/services/cocktail.service'
import { withPublic } from '@/middlewares/withAuth'
import { rateLimit } from '@/lib/rateLimit'
import { env } from '@/lib/env'
import { RecipeCardDocument, type RecipeCardCocktail } from '@/lib/pdf/RecipeCardDocument'

// react-pdf needs the Node runtime (uses Buffer + native fonts), not Edge.
export const runtime = 'nodejs'

function safeFilename(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'cocktail'
}

export const GET = withPublic(async (req, { params }) => {
    await rateLimit('pdf-export', req)

    const { id } = await params
    const cocktail = await cocktailService.getById(id)

    const pdf = await renderToBuffer(
        <RecipeCardDocument cocktail={cocktail as unknown as RecipeCardCocktail} siteUrl={env.NEXT_PUBLIC_BASE_URL} />,
    )

    return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${safeFilename(cocktail.name)}-recipe.pdf"`,
            'Cache-Control':       'private, no-store',
        },
    })
})
