import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Profile is required"]
        },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minLength: [3, "Title must have at least 3 characters"],
            maxLength: [200, "Title can have max 200 characters"]
        },

        content: {
            type: String,
            required: [true, "Post content is required"],
            trim: true,
            minLength: [5, "Post content must have at least 5 characters"],
            maxLength: [500, "Post content can have max 500 characters"]
        },

        shareCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

postSchema.index({ profile: 1, createdAt: -1 });

const Post =
    mongoose.models.Post ||
    mongoose.model("Post", postSchema);

export default Post;
