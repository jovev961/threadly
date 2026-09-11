import mongoose from "mongoose";

const repostSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required"]
        },

        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Profile is required"]
        }
    },
    {
        timestamps: true
    }
);

repostSchema.index(
    { post: 1, profile: 1 },
    { unique: true }
);

const Repost =
    mongoose.models.Repost ||
    mongoose.model("Repost", repostSchema);

export default Repost;
