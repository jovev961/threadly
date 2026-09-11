import * as responses from "@/lib/responses";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";
import { protect } from "@/lib/backend/auth";
import {
    getPagination,
    getPaginationMeta
} from "@/lib/backend/pagination";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Like from "@/models/Like";
import Comment from "@/models/Comment";
import Repost from "@/models/Repost";
import Follow from "@/models/Follow";
import Photo from "@/models/Photo";

export async function GET(request) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const profile = await Profile.findOne({
            user: user._id
        });

        if (!profile) {
            return responses.notFoundResponse("Profile");
        }

        const { page, limit, skip } =
            getPagination(request);
        const scope = request.nextUrl.searchParams.get("scope");

        let pageEvents;
        let total;

        if (scope === "discover") {
            const [posts, postCount] = await Promise.all([
                Post.find()
                    .select("_id createdAt")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Post.countDocuments()
            ]);

            pageEvents = posts.map(post => ({
                postId: post._id,
                feedType: "post",
                feedCreatedAt: post.createdAt,
                repostedBy: null
            }));
            total = postCount;
        } else {
            const follows = await Follow.find({
                follower: profile._id
            }).lean();

            const feedProfileIds = [
                profile._id,
                ...follows.map(
                    follow => follow.following
                )
            ];

            const [postEvents, repostEvents] =
                await Promise.all([
                    Post.find({
                        profile: {
                            $in: feedProfileIds
                        }
                    })
                        .select("_id createdAt")
                        .lean(),

                    Repost.find({
                        profile: {
                            $in: feedProfileIds
                        }
                    })
                        .populate({
                            path: "profile",
                            select: "name user",
                            populate: {
                                path: "user",
                                select: "username"
                            }
                        })
                        .lean()
                ]);

            const feedEvents = [
                ...postEvents.map(post => ({
                    postId: post._id,
                    feedType: "post",
                    feedCreatedAt: post.createdAt,
                    repostedBy: null
                })),

                ...repostEvents.map(repost => ({
                    postId: repost.post,
                    feedType: "repost",
                    feedCreatedAt: repost.createdAt,
                    repostedBy: repost.profile
                }))
            ];

            feedEvents.sort(
                (a, b) =>
                    new Date(b.feedCreatedAt) -
                    new Date(a.feedCreatedAt)
            );

            total = feedEvents.length;
            pageEvents = feedEvents.slice(
                skip,
                skip + limit
            );
        }

        const pagePostIds = [
            ...new Set(
                pageEvents.map(
                    event => event.postId.toString()
                )
            )
        ];

        if (pagePostIds.length === 0) {
            return responses.customResponse(
                {
                    message: "Success",
                    posts: [],
                    pagination: getPaginationMeta(
                        total,
                        page,
                        limit
                    )
                },
                200
            );
        }

        const [posts, likes, comments, reposts, photos] =
            await Promise.all([
                Post.find({
                    _id: {
                        $in: pagePostIds
                    }
                })
                    .populate({
                        path: "profile",
                        select: "name user",
                        populate: {
                            path: "user",
                            select: "username"
                        }
                    })
                    .lean(),

                Like.find({
                    post: {
                        $in: pagePostIds
                    }
                })
                    .populate({
                        path: "profile",
                        select: "name user",
                        populate: {
                            path: "user",
                            select: "username"
                        }
                    })
                    .lean(),

                Comment.find({
                    post: {
                        $in: pagePostIds
                    }
                })
                    .populate({
                        path: "profile",
                        select: "name user",
                        populate: {
                            path: "user",
                            select: "username"
                        }
                    })
                    .sort({ createdAt: 1 })
                    .lean(),

                Repost.find({
                    post: {
                        $in: pagePostIds
                    }
                }).lean(),

                Photo.find({
                    post: {
                        $in: pagePostIds
                    }
                })
                    .sort({ createdAt: 1 })
                    .lean()
            ]);

        const ownerProfileIds = [
            ...new Set(
                posts
                    .map(post =>
                        post.profile?._id?.toString()
                    )
                    .filter(Boolean)
            )
        ];

        const profilePhotos =
            ownerProfileIds.length > 0
                ? await Photo.find({
                    profile: {
                        $in: ownerProfileIds
                    },
                    post: null
                }).lean()
                : [];

        const postsById = new Map(
            posts.map(post => [
                post._id.toString(),
                post
            ])
        );

        const likesByPost = new Map();
        const commentsByPost = new Map();
        const repostsByPost = new Map();
        const photosByPost = new Map();
        const profilePhotoByProfile = new Map();

        for (const like of likes) {
            const postId = like.post.toString();

            if (!likesByPost.has(postId)) {
                likesByPost.set(postId, []);
            }

            likesByPost.get(postId).push(like);
        }

        for (const comment of comments) {
            const postId = comment.post.toString();

            if (!commentsByPost.has(postId)) {
                commentsByPost.set(postId, []);
            }

            commentsByPost.get(postId).push(comment);
        }

        for (const repost of reposts) {
            const postId = repost.post.toString();

            if (!repostsByPost.has(postId)) {
                repostsByPost.set(postId, []);
            }

            repostsByPost.get(postId).push(repost);
        }

        for (const photo of photos) {
            const postId = photo.post.toString();

            if (!photosByPost.has(postId)) {
                photosByPost.set(postId, []);
            }

            photosByPost.get(postId).push(photo);
        }

        for (const photo of profilePhotos) {
            profilePhotoByProfile.set(
                photo.profile.toString(),
                photo.path
            );
        }

        const feed = pageEvents
            .map(event => {
                const postId =
                    event.postId.toString();

                const post =
                    postsById.get(postId);

                if (!post) {
                    return null;
                }

                if (post.profile) {
                    post.profile.profilePhoto =
                        profilePhotoByProfile.get(
                            post.profile._id.toString()
                        ) || DEFAULT_PROFILE_PHOTO;
                }

                const postLikes =
                    likesByPost.get(postId) || [];

                const postComments =
                    commentsByPost.get(postId) || [];

                const postReposts =
                    repostsByPost.get(postId) || [];

                return {
                    ...post,
                    photos:
                        photosByPost.get(postId) || [],
                    likes: postLikes,
                    comments: postComments,
                    likeCount: postLikes.length,
                    commentCount: postComments.length,
                    repostCount: postReposts.length,
                    likedByMe:
                        postLikes.some(
                            like =>
                                like.profile?._id?.toString() ===
                                profile._id.toString()
                        ),
                    repostedByMe:
                        postReposts.some(
                            repost =>
                                repost.profile?.toString() ===
                                profile._id.toString()
                        ),
                    feedType:
                        event.feedType,
                    feedCreatedAt:
                        event.feedCreatedAt,
                    repostedBy:
                        event.repostedBy
                };
            })
            .filter(Boolean);

        return responses.customResponse(
            {
                message: "Success",
                posts: feed,
                pagination: getPaginationMeta(
                    total,
                    page,
                    limit
                )
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
