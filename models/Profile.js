import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
    {
        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile",
            required: [true, "Profile is required"],
            index: true
        },

        url: {
            type: String,
            required: [true, "URL is required"],
            trim: true
        },

        title: {
            type: String,
            required: [true, "Link title is required"],
            trim: true
        }
    },
    {
        timestamps: true
    }
);

export const Link =
    mongoose.models.Link ||
    mongoose.model("Link", linkSchema);

const profileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
            unique: true
        },

        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxLength: [50, "Name can have max 50 characters"]
        },

        bio: {
            type: String,
            trim: true,
            maxLength: [200, "Bio can have max 200 characters"]
        },

        gender: {
            type: String,
            enum: {
                values: ["Man", "Woman", "Prefer not to say"],
                message: "{VALUE} is not a valid gender"
            }
        }
    },
    {
        timestamps: true
    }
);

profileSchema.virtual("links", {
    ref: "Link",
    localField: "_id",
    foreignField: "profile"
});

profileSchema.virtual("followers", {
    ref: "Follow",
    localField: "_id",
    foreignField: "following"
});

profileSchema.virtual("following", {
    ref: "Follow",
    localField: "_id",
    foreignField: "follower"
});

profileSchema.set("toJSON", { virtuals: true });
profileSchema.set("toObject", { virtuals: true });

export const Profile =
    mongoose.models.Profile ||
    mongoose.model("Profile", profileSchema);
