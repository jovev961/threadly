import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }) {
    const cookieStore = await cookies();
    if (!cookieStore.get("jwt")) redirect("/login");
    return children;
}
