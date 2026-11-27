import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | MixoGuide",
    description: "How MixoGuide collects, uses, and protects your personal data.",
};

export default function PrivacyPolicyPage() {
    return (
        <article className="bg-canvas text-fg min-h-screen my-12 px-6 md:px-12 py-16 max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl italic text-brand mb-2">Privacy Policy</h1>
            <p className="text-sm text-fg-muted font-body mb-12">Last updated: April 5, 2026</p>

            <Section title="1. Who We Are">
                <p>
                    MixoGuide (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is an online cocktail management platform that helps you curate your home bar, manage your pantry, and discover recipes.
                </p>
                <p className="mt-3">
                    For any privacy-related enquiries, please contact us at:{" "}
                    <a href="mailto:contact@mixoguide.com" className="text-brand-soft-strong hover:underline">
                        contact@mixoguide.com
                    </a>
                </p>
            </Section>

            <Section title="2. Data We Collect">
                <p>We collect and process the following categories of personal data:</p>
                <SubSection title="2.1 Account data">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Full name</li>
                        <li>Email address</li>
                        <li>Password (stored as a one-way bcrypt hash — we never store the plain-text password)</li>
                        <li>Profile picture (when signing in with Google)</li>
                        <li>Email verification status and timestamps</li>
                    </ul>
                </SubSection>
                <SubSection title="2.2 App usage data">
                    <ul className="list-disc list-inside space-y-1">
                        <li>Pantry items: ingredients you own, quantities, units, expiration dates, and personal notes</li>
                        <li>Planned cocktails and planned collections</li>
                        <li>Cocktail ratings (1–5 stars)</li>
                        <li>Cocktail favourites</li>
                        <li>Shopping list items derived from your pantry</li>
                    </ul>
                </SubSection>
                <SubSection title="2.3 Authentication data">
                    <ul className="list-disc list-inside space-y-1">
                        <li>OAuth tokens issued by Google when you choose to sign in with Google (we only retain the identifiers needed to link your Google account)</li>
                        <li>JSON Web Tokens (JWT) stored in secure, HTTP-only cookies for session management</li>
                    </ul>
                </SubSection>
                <SubSection title="2.4 Technical data">
                    <ul className="list-disc list-inside space-y-1">
                        <li>IP addresses and request metadata processed in transit by Cloudflare (see Section 5)</li>
                        <li>Standard web server logs retained for security and debugging purposes</li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="3. Legal Basis for Processing (GDPR)">
                <p>We process your personal data under the following legal bases as defined by the General Data Protection Regulation (GDPR):</p>
                <table className="w-full mt-4 text-sm border-collapse">
                    <thead>
                        <tr className="bg-surface-hover">
                            <th className="text-left p-3 border border-fg/10 font-semibold">Purpose</th>
                            <th className="text-left p-3 border border-fg/10 font-semibold">Legal basis</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ["Creating and managing your account", "Performance of a contract (Art. 6(1)(b))"],
                            ["Storing your pantry and cocktail data", "Performance of a contract (Art. 6(1)(b))"],
                            ["Sending account verification and security emails", "Performance of a contract (Art. 6(1)(b))"],
                            ["Maintaining service security and preventing fraud", "Legitimate interests (Art. 6(1)(f))"],
                            ["Google OAuth sign-in", "Consent (Art. 6(1)(a)) — you initiate the OAuth flow"],
                        ].map(([purpose, basis], i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-surface" : "bg-canvas"}>
                                <td className="p-3 border border-fg/10">{purpose}</td>
                                <td className="p-3 border border-fg/10">{basis}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Section>

            <Section title="4. How We Use Your Data">
                <ul className="list-disc list-inside space-y-1">
                    <li>To provide, operate, and improve the MixoGuide platform</li>
                    <li>To authenticate you and maintain your session securely</li>
                    <li>To personalise recipe recommendations based on your pantry</li>
                    <li>To send transactional emails (e.g. email verification, password reset)</li>
                    <li>To enforce our Terms of Use and comply with applicable law</li>
                </ul>
                <p className="mt-3">We do <strong>not</strong> sell your personal data to third parties, nor do we use it for advertising.</p>
            </Section>

            <Section title="5. Data Storage &amp; Third-Party Processors">
                <SubSection title="5.1 Hosting">
                    <p>
                        Your data is stored on a dedicated Virtual Private Server (VPS) provided by <strong>Hetzner Online GmbH</strong>, located in <strong>Helsinki, Finland</strong> (European Union). Finland is subject to GDPR; no transfer outside the EEA occurs for primary data storage.
                    </p>
                </SubSection>
                <SubSection title="5.2 CDN &amp; DNS — Cloudflare">
                    <p>
                        We use <strong>Cloudflare, Inc.</strong> for DNS, DDoS protection, and CDN services. HTTP requests to MixoGuide pass through Cloudflare&rsquo;s network. Cloudflare may process IP addresses and request metadata in accordance with their{" "}
                        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-brand-soft-strong hover:underline">Privacy Policy</a>.
                        Cloudflare is certified under the EU–US Data Privacy Framework.
                    </p>
                </SubSection>
                <SubSection title="5.3 Google OAuth">
                    <p>
                        If you choose to sign in with Google, your authentication is handled by <strong>Google LLC</strong>. We receive only the basic profile information (name, email, profile picture) you authorise Google to share. Google&rsquo;s data practices are governed by their{" "}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-soft-strong hover:underline">Privacy Policy</a>.
                    </p>
                </SubSection>
            </Section>

            <Section title="6. Data Retention">
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Account data:</strong> retained for as long as your account is active. Deleting your account triggers deletion of all associated personal data within 30 days.</li>
                    <li><strong>Session tokens (JWT):</strong> expire after 30 days of inactivity.</li>
                    <li><strong>Server logs:</strong> retained for up to 90 days for security purposes, then deleted.</li>
                </ul>
            </Section>

            <Section title="7. Your Rights Under GDPR">
                <p>As a resident of the EU/EEA, you have the following rights:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><strong>Right of access</strong> — request a copy of the personal data we hold about you.</li>
                    <li><strong>Right to rectification</strong> — ask us to correct inaccurate data.</li>
                    <li><strong>Right to erasure</strong> (&ldquo;right to be forgotten&rdquo;) — request deletion of your account and associated data.</li>
                    <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format.</li>
                    <li><strong>Right to restriction of processing</strong> — ask us to limit how we use your data in certain circumstances.</li>
                    <li><strong>Right to object</strong> — object to processing based on legitimate interests.</li>
                    <li><strong>Right to withdraw consent</strong> — where processing is based on consent, withdraw it at any time without affecting prior processing.</li>
                </ul>
                <p className="mt-3">
                    To exercise any of these rights, email us at{" "}
                    <a href="mailto:contact@mixoguide.com" className="text-brand-soft-strong hover:underline">contact@mixoguide.com</a>.
                    We will respond within 30 days. You also have the right to lodge a complaint with the Finnish Data Protection Ombudsman (
                    <a href="https://tietosuoja.fi/en/home" target="_blank" rel="noopener noreferrer" className="text-brand-soft-strong hover:underline">tietosuoja.fi</a>).
                </p>
            </Section>

            <Section title="8. Cookies">
                <p>
                    We use only essential cookies necessary for authentication and session management. No advertising or tracking cookies are used. Please refer to our{" "}
                    <a href="/cookie-policy" className="text-brand-soft-strong hover:underline">Cookie Policy</a> for full details.
                </p>
            </Section>

            <Section title="9. Security">
                <p>
                    We implement appropriate technical and organisational measures to protect your data, including encrypted HTTPS connections (TLS), bcrypt password hashing, HTTP-only secure cookies, and role-based access controls. No method of transmission over the internet is 100% secure; we encourage you to use a strong, unique password.
                </p>
            </Section>

            <Section title="10. Children">
                <p>
                    MixoGuide is a platform related to alcoholic beverages and is intended solely for users who are of legal drinking age in their jurisdiction (and at a minimum 18 years of age). We do not knowingly collect data from minors. If you believe a minor has created an account, contact us at{" "}
                    <a href="mailto:contact@mixoguide.com" className="text-brand-soft-strong hover:underline">contact@mixoguide.com</a> and we will delete it promptly.
                </p>
            </Section>

            <Section title="11. Changes to This Policy">
                <p>
                    We may update this Privacy Policy from time to time. When we do, we will update the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of MixoGuide after changes are posted constitutes your acceptance of the revised policy.
                </p>
            </Section>
        </article>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-10">
            <h2 className="font-headline text-xl text-brand mb-4 pb-2 border-b border-fg/10">{title}</h2>
            <div className="text-fg-secondary font-body leading-relaxed space-y-2">{children}</div>
        </section>
    );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mt-4">
            <h3 className="font-semibold text-fg mb-2">{title}</h3>
            <div className="text-fg-secondary">{children}</div>
        </div>
    );
}
