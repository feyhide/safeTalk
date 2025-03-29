import {
  decryptMessage,
  decryptPrivateKey,
  deriveSharedSecret,
} from "../encryption/ecc.js";
import Chat from "../model/Chat.js";
import Message from "../model/Message.js";
import { sendError, sendSuccess } from "../utils/response.js";
import dotenv from "dotenv";
import User from "../model/user.js";
import GroupMessage from "../model/GroupMessage.js";
import Group from "../model/Group.js";
dotenv.config();

const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;

export const getMessages = async (req, res) => {
  const { chat, page = 1, limit = 10 } = req.query;

  try {
    const checkChat = await Chat.findById(chat);
    if (!checkChat) {
      return sendError(res, "Chat not found", null, 404);
    }

    if (!checkChat.members.includes(req.userId)) {
      return sendError(res, "You are not a member of this chat", null, 403);
    }

    const otherUserId = checkChat.members.find(
      (member) => member.toString() !== req.userId
    );
    const myFullKeys = await User.findById(req.userId).select("keys");
    if (!myFullKeys) {
      return sendError(res, "User not found", null, 404);
    }

    const otherUserFullKeys = await User.findById(otherUserId).select("keys");
    if (!otherUserFullKeys) {
      return sendError(res, "Other user not found", null, 404);
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const messages = await Message.find({ chatId: chat })
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalMessages = await Message.countDocuments({ chatId: chat });
    const totalPages = Math.ceil(totalMessages / limitNumber);

    console.log(totalMessages);
    const decryptedMessages = messages.map((message) => {
      const {
        message: encryptedMessage,
        iv,
        sender,
        senderKeyId,
        recipientKeyId,
      } = message;

      try {
        if (sender.toString() === req.userId) {
          const senderKey = myFullKeys.keys.find(
            (key) => key._id.toString() === senderKeyId
          );
          const recipientKey = otherUserFullKeys.keys.find(
            (key) => key._id.toString() === recipientKeyId
          );

          if (!senderKey || !recipientKey) {
            return { ...message._doc, decryptedMessage: null };
          }

          const decryptedPrivateKey = decryptPrivateKey(
            senderKey.encryptedPrivateKey,
            PRIVATE_KEY_SECRET,
            senderKey.iv,
            senderKey.salt
          );

          const sharedSecret = deriveSharedSecret(
            decryptedPrivateKey,
            recipientKey.publicKey
          );
          const decryptedMessage = decryptMessage(
            encryptedMessage,
            sharedSecret,
            iv
          );

          return {
            _id: message._id,
            message: decryptedMessage,
            sender: sender,
            chatId: message.chatId,
            createdAt: message.createdAt,
          };
        } else {
          const senderKey = otherUserFullKeys.keys.find(
            (key) => key._id.toString() === senderKeyId
          );
          const recipientKey = myFullKeys.keys.find(
            (key) => key._id.toString() === recipientKeyId
          );

          if (!senderKey || !recipientKey) {
            return { ...message._doc, decryptedMessage: null };
          }

          const decryptedPrivateKey = decryptPrivateKey(
            senderKey.encryptedPrivateKey,
            PRIVATE_KEY_SECRET,
            senderKey.iv,
            senderKey.salt
          );

          const sharedSecret = deriveSharedSecret(
            decryptedPrivateKey,
            recipientKey.publicKey
          );
          const decryptedMessage = decryptMessage(
            encryptedMessage,
            sharedSecret,
            iv
          );

          return {
            _id: message._id,
            message: decryptedMessage,
            sender: sender,
            chatId: message.chatId,
            createdAt: message.createdAt,
          };
        }
      } catch (decryptionError) {
        console.error(`Failed to decrypt message: ${decryptionError.message}`);
        return { ...message._doc, message: null };
      }
    });

    return res.status(200).json({
      success: true,
      data: decryptedMessages,
      totalDocs: totalMessages,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    return sendError(
      res,
      "Fetching messages failed. Try again later.",
      null,
      500
    );
  }
};

export const getGroupMessages = async (req, res) => {
  const { group, page = 1, limit = 10 } = req.query;
  try {
    const checkGroup = await Group.findById(group);
    if (!checkGroup) {
      return sendError(res, "Group not found", null, 404);
    }

    if (!checkGroup.members.includes(req.userId)) {
      return sendError(res, "You are not a member of this group", null, 403);
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    const messages = await GroupMessage.find({ groupId: group })
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalMessages = await GroupMessage.countDocuments({ groupId: group });
    const totalPages = Math.ceil(totalMessages / limitNumber);
    const decryptedMessages = [];

    for (const message of messages) {
      const decryptedMessageDetails = await Promise.all(
        message.message.map(async (msg) => {
          if (msg.memberId.toString() === req.userId.toString()) {
            const sender = await User.findById(message.sender).select(
              "_id keys"
            );

            const senderKey = sender.keys.find(
              (key) => key._id.toString() === message.senderKeyId.toString()
            );
            const member = await User.findById(msg.memberId).select("keys");
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
              _id: message._id,
              message: decryptedMessage,
              sender: sender._id,
              groupId: message.groupId,
              createdAt: message.createdAt,
            };
          }
          return null;
        })
      );

      decryptedMessages.push(
        ...decryptedMessageDetails.filter((msg) => msg !== null)
      );
    }

    return res.status(200).json({
      success: true,
      data: decryptedMessages,
      totalDocs: totalMessages,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    return sendError(
      res,
      "Fetching messages failed. Try again later.",
      null,
      500
    );
  }
};

export const getChatInfo = async (req, res) => {
  try {
    const { chatId } = req.query;

    const chat = await Chat.findById(chatId)
      .populate("members", "username avatar")
      .lean();

    console.log(chat);
    return sendSuccess(res, "fetched chat info successfully", chat, 200);
  } catch (error) {
    console.log(error);
    return sendError(res, "error fetching chat info", null, 500);
  }
};

export const getChatList = async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const chats = await Chat.find({ members: req.userId })
      .populate({
        path: "members",
        select: "_id username avatar",
      })
      .sort({ updatedAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    const chatList = chats.map((chat) => ({
      _id: chat._id,
      members: chat.members.filter(
        (member) => member._id.toString() !== req.userId
      ),
    }));

    const totalChats = await Chat.countDocuments({ members: req.userId });
    const totalPages = Math.ceil(totalChats / parsedLimit);
    console.log("fetched Chats", chatList);
    return res.status(200).json({
      success: true,
      data: chatList,
      totalChats,
      totalPages,
      currentPage: parsedPage,
    });
  } catch (error) {
    console.error("Error fetching chat list:", error);
    return sendError(res, "Error fetching chat list", null, 500);
  }
};
