import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: true
        },

        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: true
        },
    },
    {
        timestamps: true
    }
);

likeSchema.index(
    { post: 1, profile: 1 },
    { unique: true }
);

const Like =
    mongoose.models.Like ||
    mongoose.model("Like", likeSchema);

export default Like;