import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { DEFAULT_PROFILE_PHOTO } from "@/lib/profilePhoto";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Like from "@/models/Like";
import Comment from "@/models/Comment";
import Repost from "@/models/Repost";
import Photo from "@/models/Photo";
import { deletePostPhotoDirectory } from "@/lib/backend/photoStorage";

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

        const posts = await Post.find({
            profile: profile._id
        })
            .populate({
                path: "profile",
                select: "name user",
                populate: {
                    path: "user",
                    select: "username"
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        if (posts.length === 0) {
            return responses.customResponse(
                {
                    message: "Success",
                    posts: []
                },
                200
            );
        }

        const postIds = posts.map(post => post._id);

        const [likes, comments, reposts, photos, profilePhoto] = await Promise.all([
            Like.find({
                post: { $in: postIds }
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
                post: { $in: postIds }
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
                post: { $in: postIds }
            }).lean(),

            Photo.find({
                post: { $in: postIds }
            })
                .sort({ createdAt: 1 })
                .lean(),

            Photo.findOne({
                profile: profile._id,
                post: null
            }).lean()
        ]);

        const likesByPost = new Map();
        const commentsByPost = new Map();
        const repostsByPost = new Map();
        const photosByPost = new Map();

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

        const result = posts.map(post => {
            const postId = post._id.toString();
            const postLikes = likesByPost.get(postId) || [];
            const postComments = commentsByPost.get(postId) || [];
            const postReposts = repostsByPost.get(postId) || [];

            if (post.profile) {
                post.profile.profilePhoto =
                    profilePhoto?.path || DEFAULT_PROFILE_PHOTO;
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
                        profile._id.toString()
                ),
                repostedByMe: postReposts.some(
                    repost =>
                        repost.profile?.toString() ===
                        profile._id.toString()
                )
            };
        });

        return responses.customResponse(
            {
                message: "Success",
                posts: result
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}

export async function POST(request) {
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

        const { title, content } = await request.json();

        if (!title) {
            return responses.badRequestResponse("Title is required");
        }

        if (!content) {
            return responses.badRequestResponse(
                "Post content is required"
            );
        }

        const createdPost = await Post.create({
            profile: profile._id,
            title,
            content
        });

        const post = await Post.findById(createdPost._id)
            .populate({
                path: "profile",
                select: "name user",
                populate: {
                    path: "user",
                    select: "username"
                }
            })
            .lean();

        const profilePhoto = await Photo.findOne({
            profile: profile._id,
            post: null
        }).lean();

        if (post.profile) {
            post.profile.profilePhoto =
                profilePhoto?.path || DEFAULT_PROFILE_PHOTO;
        }

        return responses.customResponse(
            {
                message: "Post created",
                post: {
                    ...post,
                    photos: [],
                    likes: [],
                    comments: [],
                    likeCount: 0,
                    commentCount: 0,
                    repostCount: 0,
                    likedByMe: false,
                    repostedByMe: false
                }
            },
            201
        );
    } catch (err) {
        console.error(err);

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

        return responses.internalServerErrorResponse();
    }
}

export async function PUT(request) {
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

        const { postId, title, content } = await request.json();

        if (!postId || !mongoose.isValidObjectId(postId)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const updates = {};

        if (title !== undefined) {
            updates.title = title;
        }

        if (content !== undefined) {
            updates.content = content;
        }

        if (Object.keys(updates).length === 0) {
            return responses.badRequestResponse("Nothing to update");
        }

        const updatedPost = await Post.findOneAndUpdate(
            {
                _id: postId,
                profile: profile._id
            },
            {
                $set: updates
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedPost) {
            return responses.notFoundResponse("Post");
        }

        const post = await Post.findById(updatedPost._id)
            .populate({
                path: "profile",
                select: "name user",
                populate: {
                    path: "user",
                    select: "username"
                }
            })
            .lean();

        const [photos, likes, comments, reposts, profilePhoto] =
            await Promise.all([
                Photo.find({
                    post: post._id
                })
                    .sort({ createdAt: 1 })
                    .lean(),

                Like.find({
                    post: post._id
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
                    post: post._id
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
                    post: post._id
                }).lean(),

                Photo.findOne({
                    profile: profile._id,
                    post: null
                }).lean()
            ]);

        if (post.profile) {
            post.profile.profilePhoto =
                profilePhoto?.path || DEFAULT_PROFILE_PHOTO;
        }

        return responses.customResponse(
            {
                message: "Post updated",
                post: {
                    ...post,
                    photos,
                    likes,
                    comments,
                    likeCount: likes.length,
                    commentCount: comments.length,
                    repostCount: reposts.length,
                    likedByMe: likes.some(
                        like =>
                            like.profile?._id?.toString() ===
                            profile._id.toString()
                    ),
                    repostedByMe: reposts.some(
                        repost =>
                            repost.profile?.toString() ===
                            profile._id.toString()
                    )
                }
            },
            200
        );
    } catch (err) {
        console.error(err);

        if (err.name === "ValidationError") {
            return responses.badRequestResponse(err.message);
        }

        return responses.internalServerErrorResponse();
    }
}

export async function DELETE(request) {
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

        const { postId } = await request.json();

        if (!postId || !mongoose.isValidObjectId(postId)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findOne({
            _id: postId,
            profile: profile._id
        });

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        await deletePostPhotoDirectory(
            profile._id.toString(),
            post._id.toString()
        );

        await Promise.all([
            Like.deleteMany({ post: post._id }),
            Comment.deleteMany({ post: post._id }),
            Photo.deleteMany({ post: post._id }),
            Repost.deleteMany({ post: post._id })
        ]);

        await Post.deleteOne({
            _id: post._id
        });

        return responses.customResponse(
            {
                message: "Post deleted"
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
