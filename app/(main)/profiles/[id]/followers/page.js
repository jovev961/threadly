import ConnectionsList from "@/components/ConnectionsList";

export default async function FollowersPage({ params }) {
    const { id } = await params;
    return <ConnectionsList profileId={id} type="followers" />;
}
