import mongoose from "mongoose";

const followSchema = new mongoose.Schema(
    {
        follower: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Follower profile is required"]
        },

        following: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Following profile is required"]
        }
    },
    {
        timestamps: true
    }
);

// Prevent following the same profile twice
followSchema.index(
    { follower: 1, following: 1 },
    { unique: true }
);

const Follow =
    mongoose.models.Follow ||
    mongoose.model("Follow", followSchema);

export default Follow;
