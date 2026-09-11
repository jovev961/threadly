import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import { Profile } from "@/models/Profile";
import Post from "@/models/Post";
import Repost from "@/models/Repost";

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

        const existingRepost = await Repost.findOne({
            post: post._id,
            profile: profile._id
        });

        if (existingRepost) {
            return responses.customResponse(
                { message: "Post already reposted" },
                409
            );
        }

        const repost = await Repost.create({
            post: post._id,
            profile: profile._id
        });

        return responses.customResponse(
            {
                message: "Post reposted",
                repost
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

        const repost = await Repost.findOneAndDelete({
            post: postId,
            profile: profile._id
        });

        if (!repost) {
            return responses.notFoundResponse("Repost");
        }

        return responses.customResponse(
            { message: "Repost removed" },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
