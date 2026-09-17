import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cookie Policy | MixoGuide",
    description: "How MixoGuide uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
    return (
        <main className="bg-mg-cream text-mg-ink min-h-screen my-12 md:px-12 py-16 max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl italic text-mg-brown mb-2">Cookie Policy</h1>
            <p className="text-sm text-mg-ink/50 font-body mb-12">Last updated: April 5, 2026</p>

            <Section title="1. What Are Cookies?">
                <p>
                    Cookies are small text files placed on your device by a web server when you visit a website. They allow the site to remember your preferences and actions over a period of time, so you don&rsquo;t have to re-enter them each time you visit.
                </p>
            </Section>

            <Section title="2. Cookies We Use">
                <p>MixoGuide uses only <strong>strictly necessary cookies</strong>. We do not use advertising, tracking, or analytics cookies.</p>

                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-mg-smoke">
                                <th className="text-left p-3 border border-mg-ink/10 font-semibold">Cookie name</th>
                                <th className="text-left p-3 border border-mg-ink/10 font-semibold">Provider</th>
                                <th className="text-left p-3 border border-mg-ink/10 font-semibold">Purpose</th>
                                <th className="text-left p-3 border border-mg-ink/10 font-semibold">Duration</th>
                                <th className="text-left p-3 border border-mg-ink/10 font-semibold">Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                [
                                    "next-auth.session-token",
                                    "MixoGuide",
                                    "Stores your encrypted session JWT so you stay logged in",
                                    "30 days",
                                    "Strictly necessary",
                                ],
                                [
                                    "next-auth.csrf-token",
                                    "MixoGuide",
                                    "Cross-Site Request Forgery (CSRF) protection token",
                                    "Session",
                                    "Strictly necessary",
                                ],
                                [
                                    "next-auth.callback-url",
                                    "MixoGuide",
                                    "Remembers the page to redirect to after sign-in",
                                    "Session",
                                    "Strictly necessary",
                                ],
                                [
                                    "__Secure-next-auth.session-token",
                                    "MixoGuide",
                                    "Secure variant of session token used over HTTPS",
                                    "30 days",
                                    "Strictly necessary",
                                ],
                            ].map(([name, provider, purpose, duration, type], i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-mg-cream"}>
                                    <td className="p-3 border border-mg-ink/10 font-mono text-xs">{name}</td>
                                    <td className="p-3 border border-mg-ink/10">{provider}</td>
                                    <td className="p-3 border border-mg-ink/10">{purpose}</td>
                                    <td className="p-3 border border-mg-ink/10 whitespace-nowrap">{duration}</td>
                                    <td className="p-3 border border-mg-ink/10 whitespace-nowrap">{type}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-4 text-sm">
                    All session cookies are set with the <code className="bg-mg-smoke px-1 rounded text-xs">HttpOnly</code> and <code className="bg-mg-smoke px-1 rounded text-xs">Secure</code> flags, meaning they cannot be accessed by JavaScript and are only transmitted over HTTPS. The <code className="bg-mg-smoke px-1 rounded text-xs">SameSite</code> attribute is set to <code className="bg-mg-smoke px-1 rounded text-xs">Lax</code> to help prevent CSRF attacks.
                </p>
            </Section>

            <Section title="3. Cloudflare Cookies">
                <p>
                    Because our domain uses Cloudflare for DNS and network delivery, Cloudflare may set its own cookies (such as <code className="bg-mg-smoke px-1 rounded text-xs">__cf_bm</code> for bot management) on your device as part of their service. These cookies are necessary for Cloudflare to provide DDoS protection and performance optimisation. They are classified as strictly necessary and are governed by{" "}
                    <a href="https://www.cloudflare.com/cookie-policy/" target="_blank" rel="noopener noreferrer" className="text-mg-caramel hover:underline">Cloudflare&rsquo;s Cookie Policy</a>.
                </p>
            </Section>

            <Section title="4. Cookies We Do NOT Use">
                <p>MixoGuide does <strong>not</strong> use:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Advertising or retargeting cookies</li>
                    <li>Third-party analytics cookies (e.g. Google Analytics)</li>
                    <li>Social media tracking pixels</li>
                    <li>Fingerprinting or any other cross-site tracking technologies</li>
                </ul>
            </Section>

            <Section title="5. Legal Basis">
                <p>
                    Under the GDPR and the ePrivacy Directive, strictly necessary cookies do not require prior consent as they are essential to provide the service you have requested.
                </p>
            </Section>

            <Section title="6. Managing Cookies">
                <p>
                    You can control and delete cookies through your browser settings. Please be aware that disabling session cookies will prevent you from signing in to MixoGuide. Below are links to cookie management guides for common browsers:
                </p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-mg-caramel hover:underline">Google Chrome</a></li>
                    <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-mg-caramel hover:underline">Mozilla Firefox</a></li>
                    <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-mg-caramel hover:underline">Apple Safari</a></li>
                    <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-mg-caramel hover:underline">Microsoft Edge</a></li>
                </ul>
            </Section>

            <Section title="7. Changes to This Policy">
                <p>
                    We may update this Cookie Policy from time to time to reflect changes in technology, law, or our practices. Updates will be indicated by a revised &ldquo;Last updated&rdquo; date at the top of this page.
                </p>
            </Section>

            <Section title="8. Contact">
                <p>
                    For questions about our use of cookies, contact us at{" "}
                    <a href="mailto:contact@mixoguide.com" className="text-mg-caramel hover:underline">contact@mixoguide.com</a>.
                </p>
            </Section>
        </main>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-10">
            <h2 className="font-headline text-xl text-mg-brown mb-4 pb-2 border-b border-mg-ink/10">{title}</h2>
            <div className="text-mg-ink/80 font-body leading-relaxed space-y-2">{children}</div>
        </section>
    );
}
