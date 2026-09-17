import { guardUser } from "@/lib/auth/guards";
import AppBar from "@/components/layout/Appbar";
import {Footer} from "@/components/layout/Footer";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    await guardUser();

    return (
        <>
            <AppBar />
            <main className="pt-0 md:pt-[72px] pb-24 md:pb-0">
                {children}
            </main>
            <Footer />
        </>
    )}
