import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Like from "@/models/Like";

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

        const { postId } = await request.json();

        if (!postId || !mongoose.isValidObjectId(postId)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findById(postId);

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        const existingLike = await Like.findOne({
            post: post._id,
            profile: profile._id
        });

        if (existingLike) {
            return responses.customResponse(
                { message: "Post already liked" },
                409
            );
        }

        const like = await Like.create({
            post: post._id,
            profile: profile._id
        });

        return responses.customResponse(
            {
                message: "Post liked",
                like
            },
            201
        );
    } catch (err) {
        console.error(err);
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

        const like = await Like.findOneAndDelete({
            post: postId,
            profile: profile._id
        });

        if (!like) {
            return responses.notFoundResponse("Like");
        }

        return responses.customResponse(
            { message: "Like removed" },
            200
        );
    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
