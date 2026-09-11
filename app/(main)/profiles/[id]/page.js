import PublicProfile from "@/components/PublicProfile";

export default async function ProfilePage({ params }) {
    const { id } = await params;
    return <PublicProfile profileId={id} />;
}
