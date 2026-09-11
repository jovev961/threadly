import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            minLength: [2, "Username must have at least 2 characters"],
            maxLength: [20, "Username can have max 20 characters"]
        },

        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
            minLength: [5, "Email must have at least 5 characters"],
            maxLength: [50, "Email can have max 50 characters"]
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            select: false
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 8);
    }
});

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

export default User;
