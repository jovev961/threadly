import mongoose from "mongoose";

import * as responses from "@/lib/responses";
import { protect } from "@/lib/backend/auth";

import Post from "@/models/Post";

export async function POST(request) {
    try {
        const user = await protect(request);

        if (!user) {
            return responses.unauthorizedResponse();
        }

        const { postId } = await request.json();

        if (!postId || !mongoose.isValidObjectId(postId)) {
            return responses.badRequestResponse(
                "PostID is missing or invalid"
            );
        }

        const post = await Post.findByIdAndUpdate(
            postId,
            { $inc: { shareCount: 1 } },
            { new: true }
        );

        if (!post) {
            return responses.notFoundResponse("Post");
        }

        return responses.customResponse(
            {
                message: "Post shared",
                shareCount: post.shareCount
            },
            200
        );

    } catch (err) {
        console.error(err);
        return responses.internalServerErrorResponse();
    }
}
