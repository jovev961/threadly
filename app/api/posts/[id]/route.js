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

export async function GET(request, { params }) {
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

        const { id } = await params;

        if (!id || !mongoose.isValidObjectId(id)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findById(id)
            .populate({
                path: "profile",
                select: "name user",
                populate: {
                    path: "user",
                    select: "username"
                }
            })
            .lean();

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        const [
            likes,
            comments,
            reposts,
            photos,
            profilePhoto
        ] = await Promise.all([
            Like.find({ post: post._id })
                .populate({
                    path: "profile",
                    select: "name user",
                    populate: {
                        path: "user",
                        select: "username"
                    }
                })
                .lean(),

            Comment.find({ post: post._id })
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

            Repost.find({ post: post._id }).lean(),

            Photo.find({
                post: post._id
            })
                .sort({ createdAt: 1 })
                .lean(),

            Photo.findOne({
                profile: post.profile._id,
                post: null
            }).lean()
        ]);

        post.profile.profilePhoto =
            profilePhoto?.path || DEFAULT_PROFILE_PHOTO;

        const result = {
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
        };

        return responses.customResponse(
            {
                message: "Success",
                post: result
            },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
