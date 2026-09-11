import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
    {
        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Profile is required"],
            index: true
        },

        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: null,
            index: true
        },

        path: {
            type: String,
            required: [true, "Photo path is required"],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Photo =
    mongoose.models.Photo ||
    mongoose.model("Photo", photoSchema);

export default Photo;