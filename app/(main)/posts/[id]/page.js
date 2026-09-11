import PostDetail from "@/components/PostDetail";

export default async function PostPage({ params }) {
    const { id } = await params;
    return <PostDetail postId={id} />;
}
