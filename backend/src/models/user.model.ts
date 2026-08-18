import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        authProviderId: {
            type: String,
            required: true,
            unique: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
        },

        name: {
            type: String,
            required: true,
        },

        avatar: {
            type: String,
            default: "",
        },

        role: {
            type: String,
            enum: ["READER", "PUBLISHER", "ADMIN"],
            default: "READER",
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;