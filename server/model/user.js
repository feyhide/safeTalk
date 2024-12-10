import mongoose, { Mongoose } from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: { type: String, required: true },
    avatar: { type: String, required: true },
    keys: [
        {
            publicKey: { type: String, required: true },
            encryptedPrivateKey: { type: String, required: true },
            iv: { type: String, required: true }, 
            salt: { type: String, required: true }
        }
    ],
    activeKeyId: { type: String },
    connectedPeoples: [{
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        chatId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat"
        }
    }],
    connectedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;
