import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Use | MixoGuide",
    description: "The terms and conditions governing your use of MixoGuide.",
};

export default function TermsOfUsePage() {
    return (
        <main className="bg-mg-cream text-mg-ink min-h-screen my-12 px-6 md:px-12 py-16 max-w-4xl mx-auto">
            <h1 className="font-headline text-4xl italic text-mg-brown mb-2">Terms of Use</h1>
            <p className="text-sm text-mg-ink/50 font-body mb-12">Last updated: April 5, 2026</p>

            <Section title="1. Acceptance of Terms">
                <p>
                    By accessing or using MixoGuide (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Use (&ldquo;Terms&rdquo;). If you do not agree, you must not use the Service.
                </p>
            </Section>

            <Section title="2. Eligibility">
                <p>
                    MixoGuide is a platform related to alcoholic beverages. You must be of legal drinking age in your jurisdiction (and at least 18 years of age) to create an account or use the Service. By registering, you represent and warrant that you meet this age requirement.
                </p>
            </Section>

            <Section title="3. Account Registration">
                <ul className="list-disc list-inside space-y-1">
                    <li>You must provide accurate, current, and complete information when creating your account.</li>
                    <li>You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</li>
                    <li>You must notify us immediately at <a href="mailto:contact@mixoguide.com" className="text-mg-caramel hover:underline">contact@mixoguide.com</a> if you suspect any unauthorised use of your account.</li>
                    <li>You may not create multiple accounts or share your account with others.</li>
                    <li>Accounts created by automated means or bots are prohibited.</li>
                </ul>
            </Section>

            <Section title="4. Permitted Use">
                <p>You may use MixoGuide solely for your personal, non-commercial enjoyment. Permitted activities include:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Browsing the cocktail and ingredient catalogue</li>
                    <li>Managing your personal pantry and planned cocktails</li>
                    <li>Rating and favouriting cocktails</li>
                    <li>Sharing content within the Service as expressly permitted</li>
                </ul>
            </Section>

            <Section title="5. Prohibited Conduct">
                <p>You must not:</p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                    <li>Scrape, crawl, or systematically extract data from the Service without our prior written consent</li>
                    <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
                    <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
                    <li>Transmit malware, viruses, or any code designed to disrupt or harm the Service</li>
                    <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity</li>
                    <li>Use the Service commercially (e.g. reselling access, building competing products, data mining for commercial gain)</li>
                    <li>Post, upload, or transmit content that is unlawful, defamatory, harassing, obscene, or infringing</li>
                </ul>
            </Section>

            <Section title="6. Intellectual Property &amp; Copyright">
                <p>
                    All content, design, code, graphics, logos, text, data, and other materials made available through MixoGuide — including but not limited to the cocktail database, interface design, and brand assets — are the exclusive property of his owner or its licensors and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <p className="mt-3">
                    <strong>All rights reserved.</strong> No part of the Service or its content may be reproduced, distributed, publicly displayed, modified, adapted, translated, transmitted, published, sub-licensed, sold, or otherwise used for any commercial or non-personal purpose without the prior express written permission of the owner.
                </p>
                <p className="mt-3">
                    Permitted personal use: You may save or print individual pages solely for your own personal, non-commercial reference, provided you retain all copyright and proprietary notices.
                </p>
                <p className="mt-3">
                    Any unauthorised use constitutes an infringement of our intellectual property rights and may give rise to a claim for damages or criminal prosecution.
                </p>
            </Section>

            <Section title="7. User-Generated Content">
                <p>
                    Content you submit to MixoGuide (such as pantry notes and ratings) remains yours. By submitting content, you grant MixoGuide a non-exclusive, royalty-free, worldwide licence to store, process, and display such content solely for the purpose of providing the Service to you. We do not claim ownership of your personal data.
                </p>
            </Section>

            <Section title="8. Disclaimer of Warranties">
                <p>
                    The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.
                </p>
                <p className="mt-3">
                    Cocktail recipes and ingredient information are provided for informational purposes only. Always drink responsibly. We are not liable for any harm resulting from consumption of alcoholic beverages.
                </p>
            </Section>

            <Section title="9. Limitation of Liability">
                <p>
                    To the maximum extent permitted by applicable law, I am not liable for any indirect, incidental, special, consequential, or punitive damages — including loss of profits, data, goodwill, or other intangible losses — arising out of or in connection with your use of or inability to use the Service.
                </p>
            </Section>
            <Section title="10. Third-Party Services">
                <p>
                    The Service integrates with third-party services (e.g. Google for OAuth sign-in, Cloudflare for network delivery). We are not responsible for the privacy practices or content of these third parties. Their respective terms and policies apply to your interactions with them.
                </p>
            </Section>

            <Section title="11. Service Availability &amp; Modifications">
                <p>
                    We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice or liability. We may also update these Terms at any time. Continued use of the Service after updates constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.
                </p>
            </Section>

            <Section title="12. Termination">
                <p>
                    We may suspend or terminate your account at any time, with or without notice, if we believe you have violated these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. Sections 6, 8, 9, and 13 survive termination.
                </p>
            </Section>

            <Section title="13. Governing Law &amp; Disputes">
                <p>
                    These Terms are governed by the laws of <strong>Finland</strong>, without regard to conflict-of-law principles. Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Helsinki, Finland, unless mandatory consumer protection laws in your jurisdiction provide otherwise.
                </p>
            </Section>

            <Section title="14. Contact">
                <p>
                    For questions regarding these Terms, please contact us at{" "}
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
