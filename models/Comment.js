import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required"],
            index: true
        },

        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Profile is required"]
        },

        content: {
            type: String,
            required: [true, "Comment content is required"],
            trim: true,
            minLength: [2, "Comment must have at least 2 characters"],
            maxLength: [500, "Comment can have max 500 characters"]
        },

        parentComment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            default: null,
            index: true
        }
    },
    {
        timestamps: true
    }
);

commentSchema.index({ post: 1, createdAt: -1 });

const Comment =
    mongoose.models.Comment ||
    mongoose.model("Comment", commentSchema);

export default Comment;
