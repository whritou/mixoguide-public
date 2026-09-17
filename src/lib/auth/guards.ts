import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { options } from './authOptions'

async function currentPath(): Promise<string> {
    const h = await headers()
    return h.get('x-pathname') ?? '/'
}

/**
 * Use in a server layout or page that requires a logged-in user.
 * Redirects to /signin?callbackUrl=<current-path> if no session.
 */
export async function guardUser() {
    const session = await getServerSession(options)
    if (!session?.user) {
        const path = await currentPath()
        redirect(`/signin?callbackUrl=${encodeURIComponent(path)}`)
    }
    return session
}

/**
 * Use in a server layout or page that requires ADMIN role.
 * Redirects to /signin?callbackUrl=<current-path> if not logged in,
 * or to /unauthorized if logged in but not an admin.
 */
export async function guardAdmin() {
    const session = await getServerSession(options)
    if (!session?.user) {
        const path = await currentPath()
        redirect(`/signin?callbackUrl=${encodeURIComponent(path)}`)
    }
    if (session.user.role !== 'ADMIN') {
        redirect('/unauthorized')
    }
    return session
}
