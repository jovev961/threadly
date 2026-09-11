import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";

export default async function MainLayout({ children }) {
    const cookieStore = await cookies();
    if (!cookieStore.get("jwt")) redirect("/login");
    return <AppShell>{children}</AppShell>;
}
