import { decryptMessage, decryptPrivateKey, deriveSharedSecret } from "../encryption/ecc.js";
import Chat from "../model/Chat.js";
import Message from "../model/Message.js";
import { sendError, sendSuccess, sendValidationError } from "../utils/response.js";
import { validateGroupName, validateMongodbId } from "../utils/validation/auth_validator.js";
import dotenv from 'dotenv'
import User from "../model/user.js"
import GroupMessage from "../model/GroupMessage.js";
import Group from "../model/group.js";
import crypto from 'crypto'
dotenv.config()

const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;

export const getMessages = async (req, res) => {
    const { chatId, page = 1, limit = 3} = req.body;

    try {
        const checkChat = await Chat.findById(chatId);
        if (!checkChat) {
            return sendError(res, 'Chat not found', null, 404);
        }

        if (!checkChat.members.includes(req.userId)) {
            return sendError(res, 'You are not a member of this chat', null, 403);
        }

        const otherUserId = checkChat.members.find(member => member.toString() !== req.userId);
        const myFullKeys = await User.findById(req.userId).select("keys");
        if (!myFullKeys) {
            return sendError(res, "User not found", null, 404);
        }
        
        const otherUserFullKeys = await User.findById(otherUserId).select("keys");
        if (!otherUserFullKeys) {
            return sendError(res, "Other user not found", null, 404);
        }

        const skip = (page - 1) * limit;

        const messages = await Message.find({ chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await Message.countDocuments({ chatId });

        const decryptedMessages = messages.map((message) => {
            const { message: encryptedMessage, iv, sender, recipient, senderKeyId, recipientKeyId } = message;

            try {
                if (sender.toString() === req.userId) {
                    const senderKey = myFullKeys.keys.find(key => key._id.toString() === senderKeyId);
                    const recipientKey = otherUserFullKeys.keys.find(key => key._id.toString() === recipientKeyId);

                    if (!senderKey || !recipientKey) {
                        return { ...message._doc, decryptedMessage: null };
                    }

                    const decryptedPrivateKey = decryptPrivateKey(
                        senderKey.encryptedPrivateKey,
                        PRIVATE_KEY_SECRET,
                        senderKey.iv,
                        senderKey.salt
                    );

                    const sharedSecret = deriveSharedSecret(decryptedPrivateKey, recipientKey.publicKey);
                    const decryptedMessage = decryptMessage(encryptedMessage, sharedSecret, iv);

                    return { ...message._doc, message: decryptedMessage };
                } else {
                    const senderKey = otherUserFullKeys.keys.find(key => key._id.toString() === senderKeyId);
                    const recipientKey = myFullKeys.keys.find(key => key._id.toString() === recipientKeyId);

                    if (!senderKey || !recipientKey) {
                        return { ...message._doc, decryptedMessage: null }; 
                    }

                    const decryptedPrivateKey = decryptPrivateKey(
                        senderKey.encryptedPrivateKey,
                        PRIVATE_KEY_SECRET,
                        senderKey.iv,
                        senderKey.salt
                    );

                    const sharedSecret = deriveSharedSecret(decryptedPrivateKey, recipientKey.publicKey);
                    const decryptedMessage = decryptMessage(encryptedMessage, sharedSecret, iv);

                    return { ...message._doc, message: decryptedMessage };
                }
            } catch (decryptionError) {
                console.error(`Failed to decrypt message: ${decryptionError.message}`);
                return { ...message._doc, message: null }; 
            }
        });

        decryptedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return res.status(200).json({
            messages: decryptedMessages,
            pagination: {
                page,
                limit,
                totalMessages,
                totalPages: Math.ceil(totalMessages / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return sendError(res, 'Fetching messages failed. Try again later.', null, 500);
    }
};


export const getGroupMessages = async (req, res) => {
    const { groupId, page = 1, limit = 3 } = req.body;

    try {
        const checkGroup = await Group.findById(groupId);
        if (!checkGroup) {
            return sendError(res, 'Group not found', null, 404);
        }

        if (!checkGroup.members.includes(req.userId)) {
            return sendError(res, 'You are not a member of this group', null, 403);
        }

        const skip = (page - 1) * limit;

        const messages = await GroupMessage.find({ groupId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalMessages = await GroupMessage.countDocuments({ groupId });

        const decryptedMessages = [];

        for (const message of messages) {
            const decryptedMessageDetails = await Promise.all(
                message.message.map(async (msg) => {
                    if (msg.memberId.toString() === req.userId.toString()) {
                        const sender = await User.findById(message.sender).select('_id keys'); 
                        
                        const senderKey = sender.keys.find(
                            (key) => key._id.toString() === message.senderKeyId.toString()
                        );
                        const member = await User.findById(msg.memberId).select('keys');
                        const memberKey = member.keys.find(
                            (key) => key._id.toString() === msg.memberActiveKeyId.toString()
                        );

                        const memberDecryptedPrivateKey = decryptPrivateKey(
                            memberKey.encryptedPrivateKey,
                            PRIVATE_KEY_SECRET,
                            memberKey.iv,
                            memberKey.salt
                        );

                        const sharedSecret = deriveSharedSecret(
                            memberDecryptedPrivateKey, 
                            senderKey.publicKey 
                        );
                        const decryptedMessage = decryptMessage(
                            msg.encryptedMessage,
                            sharedSecret,
                            msg.iv
                        );

                        return {
                            message: decryptedMessage,
                            sender: sender._id,
                            groupId: message.groupId,
                            createdAt: message.createdAt
                        };
                    }
                    return null; 
                })
            );

            decryptedMessages.push(...decryptedMessageDetails.filter((msg) => msg !== null));
        }
        
        decryptedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return res.status(200).json({
            messages: decryptedMessages,
            pagination: {
                page,
                limit,
                totalMessages,
                totalPages: Math.ceil(totalMessages / limit),
            },
        });
    } catch (error) {
        console.error(error);
        return sendError(res, 'Fetching messages failed. Try again later.', null, 500);
    }
};
