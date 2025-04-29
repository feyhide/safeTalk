import { disconnect } from "mongoose";
import { Server as SocketIoServer } from "socket.io";
import User from "../model/user.js";
import { getKeys } from "../controller/user.js";
import {
  decryptMessage,
  decryptPrivateKey,
  deriveSharedSecret,
  encryptMessage,
} from "../encryption/ecc.js";
import dotenv from "dotenv";
import Chat from "../model/Chat.js";
import Message from "../model/Message.js";
import crypto from "crypto";
import Group from "../model/Group.js";
import GroupMessage from "../model/GroupMessage.js";
dotenv.config();

const uploadFilesToCloudinary = (fileBuffer, fileType) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: "safeTalk",
      use_filename: true,
      unique_filename: true,
    };

    if (fileType.startsWith("image/")) {
      uploadOptions.transformation = [
        {
          quality: "auto:low",
          width: 800,
          crop: "scale",
        },
      ];
    }

    let resourceType = "auto";
    if (fileType.startsWith("video/")) {
      resourceType = "video";
    } else if (
      !fileType.startsWith("image/") &&
      !fileType.startsWith("video/")
    ) {
      resourceType = "raw";
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { ...uploadOptions, resource_type: resourceType },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const setUpSocket = (server) => {
  let prod = true;

  const io = new SocketIoServer(server, {
    cors: {
      origin: prod ? process.env.ORIGIN_PRODUCTION : process.env.ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  const userSocketMap = new Map();

  const disconnect = (socket) => {
    console.log(`client disconnect: ${socket.id}`);
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  };

  const sendMessage = async (messagePayload) => {
    const senderSocketId = userSocketMap.get(messagePayload.sender);
    const recipientSocketId = userSocketMap.get(messagePayload.recipient);

    try {
      if (!messagePayload.sender || !messagePayload.recipient) {
        console.error("Sender or recipient ID is missing");
        return;
      }

      const chat = await Chat.findById(messagePayload.chatId);
      if (!chat) {
        console.error("Chat not found");
        return;
      }

      const senderUser = await User.findById(messagePayload.sender).select(
        "keys activeKeyId"
      );
      if (!senderUser) {
        console.error("Sender not found in database:", messagePayload.sender);
        return;
      }

      const recipientUser = await User.findById(
        messagePayload.recipient
      ).select("keys activeKeyId");
      if (!recipientUser) {
        console.error(
          "Recipient not found in database:",
          messagePayload.recipient
        );
        return;
      }

      const senderKey = senderUser.keys.find(
        (key) => key._id.toString() === senderUser.activeKeyId
      );
      if (!senderKey) {
        console.error("Sender's active key not found");
        return;
      }

      const recipientKey = recipientUser.keys.find(
        (key) => key._id.toString() === recipientUser.activeKeyId
      );
      if (!recipientKey) {
        console.error("Recipient's active key not found");
        return;
      }

      const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;

      const senderDecryptedPrivateKey = decryptPrivateKey(
        senderKey.encryptedPrivateKey,
        PRIVATE_KEY_SECRET,
        senderKey.iv,
        senderKey.salt
      );

      const sharedSecretSender = deriveSharedSecret(
        senderDecryptedPrivateKey,
        recipientKey.publicKey
      );

      const { encrypted: messageEncrypted, iv: messageIv } = encryptMessage(
        messagePayload.message,
        sharedSecretSender
      );

      const message = new Message({
        message: messageEncrypted,
        iv: messageIv,
        sender: messagePayload.sender,
        recipient: messagePayload.recipient,
        senderKeyId: senderKey._id,
        recipientKeyId: recipientKey._id,
        chatId: messagePayload.chatId,
      });

      await message.save();

      const decryptedMessage = decryptMessage(
        messageEncrypted,
        sharedSecretSender,
        messageIv
      );

      let _messagePayload = {
        _id: message._id,
        message: decryptedMessage,
        sender: messagePayload.sender,
        createdAt: message.createdAt,
        chatId: messagePayload.chatId,
      };

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receivedMessage", _messagePayload);
      }

      if (senderSocketId) {
        io.to(senderSocketId).emit("receivedMessage", _messagePayload);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const sendMessageGroup = async (messagePayload) => {
    try {
      const { sender, members, message, groupId } = messagePayload;

      if (!sender || !members || !message || !groupId) {
        console.error(
          "Missing required fields in messagePayload:",
          messagePayload
        );
        return;
      }

      const senderUser = await User.findById(sender).select("keys activeKeyId");
      if (!senderUser) {
        console.error("Sender not found in database:", sender);
        return;
      }

      const group = await Group.findById(groupId);

      if (!group) {
        console.error("Group not found");
        return;
      }

      const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET;
      const senderActiveKey = senderUser.keys.find(
        (key) => key._id.toString() === senderUser.activeKeyId
      );

      if (!senderActiveKey) {
        console.error("Sender active key not found.");
        return;
      }

      const senderDecryptedPrivateKey = decryptPrivateKey(
        senderActiveKey.encryptedPrivateKey,
        PRIVATE_KEY_SECRET,
        senderActiveKey.iv,
        senderActiveKey.salt
      );

      const encryptedMessages = await Promise.all(
        members.map(async (memberId) => {
          const member = await User.findById(memberId).select(
            "keys activeKeyId"
          );
          if (!member) {
            console.error(`Member not found in database: ${memberId}`);
            return null;
          }

          const memberActiveKey = member.keys.find(
            (key) => key._id.toString() === member.activeKeyId
          );
          if (!memberActiveKey) {
            console.error(`Active key not found for member: ${memberId}`);
            return null;
          }

          const sharedSecret = deriveSharedSecret(
            senderDecryptedPrivateKey,
            memberActiveKey.publicKey
          );

          const { encrypted: encryptedMessage, iv } = encryptMessage(
            message,
            sharedSecret
          );

          return {
            encryptedMessage,
            iv,
            memberActiveKeyId: memberActiveKey._id,
            memberId: member._id,
          };
        })
      );

      const validEncryptedMessages = encryptedMessages.filter(Boolean);

      const groupMessage = new GroupMessage({
        message: validEncryptedMessages,
        sender,
        senderKeyId: senderActiveKey._id,
        groupId,
      });

      await groupMessage.save();

      const sampleMessage = validEncryptedMessages[0];
      const member = await User.findById(sampleMessage.memberId).select("keys");
      const memberKey = member.keys.find(
        (key) =>
          key._id.toString() === sampleMessage.memberActiveKeyId.toString()
      );
      const sharedSecret = deriveSharedSecret(
        senderDecryptedPrivateKey,
        memberKey.publicKey
      );
      const decryptedMessage = decryptMessage(
        sampleMessage.encryptedMessage,
        sharedSecret,
        sampleMessage.iv
      );

      const responsePayload = {
        _id: groupMessage._id,
        message: decryptedMessage,
        sender,
        groupId,
        createdAt: groupMessage.createdAt,
      };

      members.forEach((memberId) => {
        const socketId = userSocketMap.get(memberId.toString());
        if (socketId) {
          io.to(socketId).emit("receivedGroupMessage", responsePayload);
        }
      });
    } catch (error) {
      console.error("Error in sendMessageGroup:", error);
    }
  };

  const handleAddMemberToGroup = async (request) => {
    const { groupId, userId, requestUser } = request;
    try {
      if (!groupId || !userId || !requestUser) {
        console.error("groupId or userId or requestUser is missing");
        return;
      }

      const user = await User.findById(userId);

      if (!user) {
        console.error(error);
        return;
      }

      const adderUser = await User.findById(requestUser);
      if (!adderUser) {
        console.error(error);
        return;
      }
      const group = await Group.findById(groupId);

      if (!group) {
        console.error(error);
        return;
      }

      let member = group?.members.find(
        (member) => member.user._id.toString() === requestUser
      );

      if (member?.role !== "admin") {
        console.log("only admin can add");
        return;
      } else if (member?.role === "admin") {
        console.log("admin adding");
      }

      if (!Array.isArray(user.connectedGroups)) {
        user.connectedGroups = [];
      }

      group.members.push({ user: user._id, role: "member" });
      user.connectedGroups.push(group._id);
      await group.save();
      await user.save();

      const updatedGroup = await Group.findById(groupId)
        .populate({
          path: "members.user",
          select: "_id username avatar",
        })
        .populate({
          path: "pastMembers",
          select: "_id username avatar",
        });

      group.members.forEach((memberId) => {
        if (userSocketMap.has(memberId.user._id.toString())) {
          const socketId = userSocketMap.get(memberId.user._id.toString());
          io.to(socketId).emit("newMemberAdded", {
            groupId,
            updatedGroup,
          });
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddConnection = async (connection) => {
    const { sender, recipient } = connection;

    const recipientSocketId = userSocketMap.get(recipient);
    const senderSocketId = userSocketMap.get(sender);
    try {
      if (!sender || !recipient) {
        console.error("Sender or recipient ID is missing");
        return;
      }

      const senderUser = await User.findById(sender).select(
        "username avatar _id"
      );

      if (!senderUser) {
        console.error("Sender user not found");
        return;
      }

      const recipientUser = await User.findById(recipient).select(
        "username avatar _id"
      );

      if (!recipientUser) {
        console.error("Recipient user not found");
        return;
      }

      const existingChat = await Chat.findOne({
        members: { $all: [sender, recipient] },
      });

      if (existingChat) {
        console.log(existingChat.members);
        console.log("already exist");
        return;
      }

      const chat = await Chat.findOne({
        members: { $in: [sender] },
        pastMembers: { $in: [recipient] },
      });

      let responseData;

      if (chat) {
        chat.pastMembers = chat.pastMembers.filter(
          (id) => id.toString() !== recipient.toString()
        );
        if (
          !chat.members.some((id) => id.toString() === recipient.toString())
        ) {
          chat.members.push(recipient);
        }
        await chat.save();

        const updatedChat = await Chat.findById(chat._id)
          .populate({
            path: "members",
            select: "_id username avatar",
          })
          .populate({
            path: "pastMembers",
            select: "_id username avatar",
          });

        responseData = {
          status: "Existing",
          sender,
          recipient,
          data: updatedChat,
        };
      } else {
        const newChat = new Chat({
          members: [recipient, sender],
        });

        await newChat.save();

        const newUpdatedChat = await Chat.findById(newChat._id)
          .populate({
            path: "members",
            select: "_id username avatar",
          })
          .populate({
            path: "pastMembers",
            select: "_id username avatar",
          });

        responseData = {
          status: "New",
          data: newUpdatedChat,
        };
      }

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("connectionUpdated", responseData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("connectionUpdated", responseData);
      }
    } catch (error) {
      console.error("Error adding connection:", error);
    }
  };

  const handleRemoveFriend = async (request) => {
    try {
      const senderSocketId = userSocketMap.get(request.sender);
      const senderUser = await User.findById(request.sender);

      if (!senderUser) {
        console.error("Sender user not found");
        return;
      }

      const chat = await Chat.findById(request.chatId);
      if (!chat) {
        console.error("Chat not found");
        return;
      }

      if (chat.members.length === 1) {
        await Message.deleteMany({ chatId: chat._id });
        await Chat.findByIdAndDelete(chat._id);

        const responseData = {
          status: "chatRemoved",
          chatId: chat._id,
        };

        if (senderSocketId) {
          io.to(senderSocketId).emit("connectionRemoved", responseData);
        }
        return;
      }

      chat.members = chat.members.filter(
        (member) => member.toString() !== request.sender
      );
      chat.pastMembers.push(request.sender);
      await chat.save();

      const recipientSocketId = userSocketMap.get(chat.members[0].toString());

      const updatedChat = await Chat.findById(chat._id)
        .select("_id members pastMembers")
        .populate({
          path: "members",
          select: "_id username avatar",
        })
        .populate({
          path: "pastMembers",
          select: "_id username avatar",
        });

      const filteredMembersForSender = updatedChat.members.filter((member) => {
        return member._id.toString() !== request.sender;
      });

      const filteredMembersForRecipient = updatedChat.members.filter(
        (member) => {
          return member._id.toString() !== chat.members[0].toString();
        }
      );

      const SresponseData = {
        status: "memberLeaved",
        memberLeaved: request.sender,
        data: {
          _id: updatedChat._id,
          members: filteredMembersForSender,
          pastMembers: updatedChat.pastMembers,
        },
      };

      const RresponseData = {
        status: "memberLeaved",
        memberLeaved: request.sender,
        data: {
          _id: updatedChat._id,
          members: filteredMembersForRecipient,
          pastMembers: updatedChat.pastMembers,
        },
      };
      console.log("res R", { RresponseData });
      console.log("res S", { SresponseData });

      if (senderSocketId) {
        io.to(senderSocketId).emit("connectionRemoved", SresponseData);
      }
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("connectionRemoved", RresponseData);
      }
    } catch (error) {
      console.error("Error handling connection removal:", error.message);
    }
  };

  const handleRemoveMember = async (request) => {
    try {
      if (request.sender === request.userTodel) {
        console.log("you cant do that ");
        return;
      }
      const senderUser = await User.findById(request.sender);

      if (!senderUser) {
        console.error("Sender user not found");
        return;
      }

      const group = await Group.findById(request.groupId);
      if (!group) {
        console.error("Group not found");
        return;
      }

      let member = group?.members.find(
        (member) => member.user._id.toString() === request.sender
      );

      if (member?.role !== "admin") {
        console.log("only admin can removed shit");
        return;
      }

      const userToDel = await User.findById(request.userTodel);
      if (!userToDel) {
        console.error("User to remove not found");
        return;
      }

      group.members = group.members.filter(
        (member) => member.user._id.toString() !== userToDel._id.toString()
      );

      group.pastMembers.push(userToDel._id);

      await group.save();

      const updatedGroup = await Group.findById(request.groupId)
        .populate({
          path: "members.user",
          select: "_id username avatar",
        })
        .populate({
          path: "pastMembers",
          select: "_id username avatar",
        });

      request.members.forEach((memberId) => {
        if (userSocketMap.has(memberId.toString())) {
          const socketId = userSocketMap.get(memberId.toString());
          io.to(socketId).emit("removedMember", {
            groupId: request.groupId,
            removedUser: userToDel._id,
            updatedGroup,
          });
        }
      });
    } catch (error) {
      console.error("Error removing member from group:", error.message);
    }
  };

  const handleLeaveGroup = async (request) => {
    try {
      const senderUser = await User.findById(request.sender);

      if (!senderUser) {
        console.error("Sender user not found");
        return;
      }

      const group = await Group.findById(request.groupId);
      if (!group) {
        console.error("Group not found");
        return;
      }

      let member = group?.members.find(
        (member) => member.user._id.toString() === request.sender.toString()
      );

      let responseType = "Error";

      if (member?.role === "admin" && group?.members.length === 1) {
        responseType = "GroupDeleted";
        await GroupMessage.deleteMany({ groupId: group._id });
        await Group.findByIdAndDelete(group._id);
      } else if (member?.role === "admin" && group?.members.length > 1) {
        responseType = "AdminError";
        console.log("cannot leave group as an admin with members > 1");
      } else {
        responseType = "MemberLeaved";
        group.members = group.members.filter(
          (member) => member.user._id.toString() !== request.sender.toString()
        );
        group.pastMembers.push(request.sender);
        await group.save();
      }

      let response = {};

      switch (responseType) {
        case "AdminError":
          response.status = responseType;
          response.message =
            "Admin cannot leave group with members > 1, assign someone else adminship";
          break;
        case "MemberLeaved":
          const updatedGroup = await Group.findById(request.groupId)
            .populate({
              path: "members.user",
              select: "_id username avatar",
            })
            .populate({
              path: "pastMembers",
              select: "_id username avatar",
            });
          response.status = responseType;
          response.message = "Member Leaved";
          response.groupId = group._id;
          response.updatedGroup = updatedGroup;
          response.removedMember = request.sender;
          break;
        case "GroupDeleted":
          response.status = responseType;
          response.message = "Group Deleted";
          response.groupId = group._id;
          break;
        default:
          response.status = responseType;
          response.message = "An Error Occured";
          break;
      }

      request.members.forEach((memberId) => {
        if (userSocketMap.has(memberId.toString())) {
          const socketId = userSocketMap.get(memberId.toString());
          io.to(socketId).emit("leavedGroup", response);
        }
      });
    } catch (error) {
      console.error("Error removing member from group:", error.message);
    }
  };

  const handleChangeRole = async (request) => {
    try {
      if (request.sender === request.userToChangeRole) {
        console.log("you cant do that ");
        return;
      }
      const senderUser = await User.findById(request.sender);

      if (!senderUser) {
        console.error("Sender user not found");
        return;
      }

      const group = await Group.findById(request.groupId);
      if (!group) {
        console.error("Group not found");
        return;
      }

      let member = group?.members.find(
        (member) => member.user._id.toString() === request.sender
      );

      if (member?.role !== "admin") {
        console.log("only admin can promote shit");
        return;
      }

      const userToChangeRole = await User.findById(request.userToChangeRole);
      if (!userToChangeRole) {
        console.error("User to change role not found");
        return;
      }

      group.members = group.members.map((member) => {
        if (member.user._id.toString() === userToChangeRole._id.toString()) {
          return {
            ...member,
            role: member.role === "admin" ? "member" : "admin",
          };
        }
        return member;
      });

      await group.save();

      const updatedGroup = await Group.findById(request.groupId)
        .populate({
          path: "members.user",
          select: "_id username avatar",
        })
        .populate({
          path: "pastMembers",
          select: "_id username avatar",
        });

      request.members.forEach((memberId) => {
        if (userSocketMap.has(memberId.toString())) {
          const socketId = userSocketMap.get(memberId.toString());
          io.to(socketId).emit("changedRole", {
            groupId: request.groupId,
            updatedGroup,
          });
        }
      });
    } catch (error) {
      console.error("Error changing role of member in group:", error.message);
    }
  };

  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`user connected: ${userId} with socketID: ${socket.id}`);
    } else {
      console.log("User id is not provided during connection");
    }

    socket.on("removeFriend", handleRemoveFriend);
    socket.on("removeMember", handleRemoveMember);
    socket.on("changeRole", handleChangeRole);
    socket.on("leaveGroup", handleLeaveGroup);
    socket.on("sendConnection", handleAddConnection);
    socket.on("addMemberToGroup", handleAddMemberToGroup);
    socket.on("sendMessageGroup", sendMessageGroup);
    socket.on("sendMessage", sendMessage);
    socket.on("disconnect", () => disconnect(socket));
  });
};

export default setUpSocket;
