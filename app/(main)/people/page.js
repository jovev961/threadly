"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileCard from "@/components/ProfileCard";
import { getProfiles } from "@/lib/frontend/profiles";

export default function PeoplePage() {
    const router = useRouter();
    const [profiles, setProfiles] = useState([]);
    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function load(nextSearch = activeSearch, page = 1, append = false) {
        setLoading(true);
        setError("");
        try {
            const result = await getProfiles({ search: nextSearch, page, limit: 12 });
            setProfiles(current => append ? [...current, ...result.body] : result.body);
            setPagination(result.pagination);
        } catch (err) {
            if (err.status === 401) router.replace("/login");
            else if (err.status === 404) router.replace("/onboarding");
            else setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;
        getProfiles({ page: 1, limit: 12 })
            .then(result => {
                if (!active) return;
                setProfiles(result.body);
                setPagination(result.pagination);
            })
            .catch(err => {
                if (!active) return;
                if (err.status === 401) router.replace("/login");
                else if (err.status === 404) router.replace("/onboarding");
                else setError(err.message);
            })
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [router]);

    function handleSearch(event) {
        event.preventDefault();
        const value = search.trim();
        setActiveSearch(value);
        load(value, 1);
    }

    return (
        <section className="standardPage">
            <div className="pageHeader"><span className="eyebrow">Find your people</span><h1>People</h1><p>Search by display name or username, then shape your feed.</p></div>
            <form className="searchBar" onSubmit={handleSearch}><label className="visuallyHidden" htmlFor="people-search">Search people</label><input id="people-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people…" /><button className="button">Search</button></form>
            {activeSearch && <div className="resultsLabel">Results for “{activeSearch}” <button className="textButton" onClick={() => { setSearch(""); setActiveSearch(""); load("", 1); }}>Clear</button></div>}
            {error && <div className="notice error" role="alert">{error}</div>}
            {!loading && !error && profiles.length === 0 && <div className="emptyState"><h2>No people found.</h2><p>Try another name or username.</p></div>}
            <div className="peopleGrid">{profiles.map(profile => <ProfileCard key={profile._id} initialProfile={profile} />)}</div>
            {loading && <div className="loadingCard">Looking for people…</div>}
            {pagination?.hasNextPage && !loading && <button className="button secondary loadMore" onClick={() => load(activeSearch, pagination.page + 1, true)}>Load more people</button>}
        </section>
    );
}
