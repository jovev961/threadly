import Link from "next/link";

export default function NotFound() {
    return <main className="standaloneState"><span className="brand">threadly<span>.</span></span><span className="eyebrow">404</span><h1>This thread went missing.</h1><p>The page may have been removed or the link is no longer valid.</p><Link className="button" href="/">Return home</Link></main>;
}
