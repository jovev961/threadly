import ConnectionsList from "@/components/ConnectionsList";

export default async function FollowingPage({ params }) {
    const { id } = await params;
    return <ConnectionsList profileId={id} type="following" />;
}
