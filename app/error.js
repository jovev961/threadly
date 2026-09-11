"use client";

export default function ErrorPage({ reset }) {
    return <main className="standaloneState"><span className="brand">threadly<span>.</span></span><span className="eyebrow">Unexpected error</span><h1>Something interrupted the conversation.</h1><p>Please try loading this page again.</p><button className="button" onClick={reset}>Try again</button></main>;
}
