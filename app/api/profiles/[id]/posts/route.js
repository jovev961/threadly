import mongoose from "mongoose";

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
import Photo from "@/models/Photo";

export async function GET(request, { params }) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const currentProfile = await Profile.findOne({
            user: user._id
        });

        if (!currentProfile) {
            return responses.notFoundResponse("Profile");
        }

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "ProfileID is missing or invalid"
            );
        }

        const targetProfile = await Profile.findById(id);

        if (!targetProfile) {
            return responses.notFoundResponse("Profile");
        }

        const view = request.nextUrl.searchParams.get("view");
        const { page, limit, skip } = getPagination(request);

        let events;
        let total;

        if (view === "reposts") {
            const [reposts, repostCount] = await Promise.all([
                Repost.find({ profile: targetProfile._id })
                    .select("post createdAt")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Repost.countDocuments({ profile: targetProfile._id })
            ]);

            events = reposts.map(repost => ({
                postId: repost.post,
                feedType: "repost",
                feedCreatedAt: repost.createdAt,
                repostedBy: {
                    _id: targetProfile._id,
                    name: targetProfile.name
                }
            }));
            total = repostCount;
        } else {
            const [posts, postCount] = await Promise.all([
                Post.find({ profile: targetProfile._id })
                    .select("_id createdAt")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Post.countDocuments({ profile: targetProfile._id })
            ]);

            events = posts.map(post => ({
                postId: post._id,
                feedType: "post",
                feedCreatedAt: post.createdAt,
                repostedBy: null
            }));
            total = postCount;
        }

        if (events.length === 0) {
            return responses.customResponse({
                message: "Success",
                posts: [],
                pagination: getPaginationMeta(total, page, limit)
            });
        }

        const postIds = events.map(event => event.postId);

        const [posts, likes, comments, reposts, photos] =
            await Promise.all([
                Post.find({ _id: { $in: postIds } })
                    .populate({
                        path: "profile",
                        select: "name user",
                        populate: {
                            path: "user",
                            select: "username"
                        }
                    })
                    .lean(),
                Like.find({ post: { $in: postIds } })
                    .populate({
                        path: "profile",
                        select: "name user",
                        populate: {
                            path: "user",
                            select: "username"
                        }
                    })
                    .lean(),
                Comment.find({ post: { $in: postIds } })
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
                Repost.find({ post: { $in: postIds } }).lean(),
                Photo.find({ post: { $in: postIds } })
                    .sort({ createdAt: 1 })
                    .lean()
            ]);

        const ownerProfileIds = [
            ...new Set(
                posts
                    .map(post => post.profile?._id?.toString())
                    .filter(Boolean)
            )
        ];

        const profilePhotos = ownerProfileIds.length > 0
            ? await Photo.find({
                profile: { $in: ownerProfileIds },
                post: null
            }).lean()
            : [];

        const postsById = new Map(
            posts.map(post => [post._id.toString(), post])
        );

        const groupByPost = items => {
            const grouped = new Map();

            for (const item of items) {
                const postId = item.post.toString();
                if (!grouped.has(postId)) grouped.set(postId, []);
                grouped.get(postId).push(item);
            }

            return grouped;
        };

        const likesByPost = groupByPost(likes);
        const commentsByPost = groupByPost(comments);
        const repostsByPost = groupByPost(reposts);
        const photosByPost = groupByPost(photos);
        const profilePhotoByProfile = new Map(
            profilePhotos.map(photo => [
                photo.profile.toString(),
                photo.path
            ])
        );

        const results = events
            .map(event => {
                const postId = event.postId.toString();
                const post = postsById.get(postId);

                if (!post) return null;

                const postLikes = likesByPost.get(postId) || [];
                const postComments = commentsByPost.get(postId) || [];
                const postReposts = repostsByPost.get(postId) || [];

                if (post.profile) {
                    post.profile.profilePhoto =
                        profilePhotoByProfile.get(
                            post.profile._id.toString()
                        ) || DEFAULT_PROFILE_PHOTO;
                }

                return {
                    ...post,
                    photos: photosByPost.get(postId) || [],
                    likes: postLikes,
                    comments: postComments,
                    likeCount: postLikes.length,
                    commentCount: postComments.length,
                    repostCount: postReposts.length,
                    likedByMe: postLikes.some(
                        like =>
                            like.profile?._id?.toString() ===
                            currentProfile._id.toString()
                    ),
                    repostedByMe: postReposts.some(
                        repost =>
                            repost.profile?.toString() ===
                            currentProfile._id.toString()
                    ),
                    feedType: event.feedType,
                    feedCreatedAt: event.feedCreatedAt,
                    repostedBy: event.repostedBy
                };
            })
            .filter(Boolean);

        return responses.customResponse({
            message: "Success",
            posts: results,
            pagination: getPaginationMeta(total, page, limit)
        });
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
