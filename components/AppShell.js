"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/frontend/auth";
import Icon from "./Icon";

const navigation = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/discover", label: "Discover", icon: "discover" },
    { href: "/people", label: "People", icon: "people" },
    { href: "/profile", label: "Profile", icon: "user" },
    { href: "/settings", label: "Settings", icon: "settings" }
];

export default function AppShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logout();
            router.replace("/login");
            router.refresh();
        } finally {
            setLoggingOut(false);
        }
    }

    function isActive(href) {
        if (href === "/") return pathname === "/";
        if (href === "/profile") {
            return pathname === "/profile";
        }
        return pathname.startsWith(href);
    }

    return (
        <div className="appFrame">
            <header className="mobileHeader">
                <Link href="/" className="brand">threadly<span>.</span></Link>
            </header>

            <aside className="sidebar">
                <Link href="/" className="brand">threadly<span>.</span></Link>
                <nav className="sideNav" aria-label="Primary navigation">
                    {navigation.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={isActive(item.href) ? "navItem active" : "navItem"}
                        >
                            <Icon name={item.icon} size={22} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <button className="navItem logoutButton" onClick={handleLogout} disabled={loggingOut}>
                    <Icon name="logout" size={22} />
                    <span>{loggingOut ? "Logging out…" : "Log out"}</span>
                </button>
            </aside>

            <main className="appMain">{children}</main>

            <nav className="bottomNav" aria-label="Mobile navigation">
                {navigation.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-label={item.label}
                        className={isActive(item.href) ? "active" : ""}
                    >
                        <Icon name={item.icon} size={22} />
                    </Link>
                ))}
            </nav>
        </div>
    );
}
