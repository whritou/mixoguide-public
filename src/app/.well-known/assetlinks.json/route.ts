import { env } from '@/lib/env'

const RELATION = ['delegate_permission/common.handle_all_urls']
const PACKAGE_NAME = 'com.mixoguide.app'

function certificateFingerprints() {
    return (env.ANDROID_CERT_SHA256_FINGERPRINTS ?? '')
        .split(',')
        .map((fingerprint) => fingerprint.trim())
        .filter(Boolean)
}

export function GET() {
    const fingerprints = certificateFingerprints()

    return Response.json(
        fingerprints.length > 0
            ? [
                {
                    relation: RELATION,
                    target: {
                        namespace: 'android_app',
                        package_name: PACKAGE_NAME,
                        sha256_cert_fingerprints: fingerprints,
                    },
                },
            ]
            : [],
        {
            headers: {
                'Cache-Control': 'public, max-age=3600',
                'Content-Type': 'application/json',
            },
        }
    )
}
