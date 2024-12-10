import { disconnect } from 'mongoose';
import {Server as SocketIoServer} from 'socket.io'
import User from '../model/user.js';
import { getKeys } from '../controller/user.js';
import { decryptMessage, decryptPrivateKey, deriveSharedSecret, encryptMessage, signMessage } from '../encryption/ecc.js';
import dotenv from 'dotenv'
import Chat from '../model/Chat.js';
import Message from '../model/Message.js';
import crypto from 'crypto'
import Group from '../model/Group.js';
import GroupMessage from '../model/GroupMessage.js';
dotenv.config()

const setUpSocket = (server) => {
    console.log("CORS origin is: ", process.env.ORIGIN);

    const io = new SocketIoServer(server, {
        cors: {
          origin: process.env.ORIGIN, 
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ["websocket", "polling"], 
    });

    const userSocketMap = new Map();

    const disconnect = (socket) => {
        console.log(`client disconnect: ${socket.id}`)
        for(const [userId,socketId] of userSocketMap.entries()){
            if(socketId === socket.id){
              userSocketMap.delete(userId)
              break;
            }
        }
    }

    const sendMessage = async (messagePayload) => {
        const senderSocketId = userSocketMap.get(messagePayload.sender)
        const recipientSocketId = userSocketMap.get(messagePayload.recipient)
        
        try {
          if (!messagePayload.sender || !messagePayload.recipient) {
            console.error("Sender or recipient ID is missing");
            return;
          }

          const PRIVATE_KEY_SECRET = process.env.PRIVATE_KEY_SECRET
          const senderDecryptedPrivateKey = decryptPrivateKey(messagePayload.senderPvtKey.encryptedPrivateKey,PRIVATE_KEY_SECRET, messagePayload.senderPvtKey.iv, messagePayload.senderPvtKey.salt);
          const sharedSecretSender = deriveSharedSecret(senderDecryptedPrivateKey, messagePayload.recipientPbcKey.publicKey);
          const { encrypted: messageEncrypted, iv: messageIv } = encryptMessage(messagePayload.message, sharedSecretSender);
          const chat = await Chat.findById(messagePayload.chatId);
        
          if (!chat) {
              console.error("Chat not found");
              return;
          }

          const message = new Message({
              message: messageEncrypted,
              iv: messageIv,
              sender: messagePayload.sender,
              recipient: messagePayload.recipient,
              senderKeyId: messagePayload.senderPvtKey._id,
              recipientKeyId: messagePayload.recipientPbcKey._id,
              chatId: messagePayload.chatId
          });

          await message.save()

          const decryptedMessage = decryptMessage(messageEncrypted, sharedSecretSender, messageIv);
          
          let _messagePayload = {
            message: decryptedMessage,
            sender: messagePayload.sender,
            recipient: messagePayload.recipient,
          };

          if(recipientSocketId){
              io.to(recipientSocketId).emit("receivedMessage",_messagePayload)
          }

          if(senderSocketId){
              io.to(senderSocketId).emit("receivedMessage",_messagePayload)
          }
        } catch (error) {
          console.error("Error sending message:", error);
        }
    }

    const sendMessageGroup = async (messagePayload) => {
      try {
        const { sender, members, message, groupId } = messagePayload;
    
        if (!sender || !members || !message || !groupId) {
          console.error("Missing required fields in messagePayload:", messagePayload);
          return;
        }
    
        const senderUser = await User.findById(sender).select('keys activeKeyId');
        if (!senderUser) {
          console.error("Sender not found in database:", sender);
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
            const member = await User.findById(memberId).select('keys activeKeyId');
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
    
            const { encrypted: encryptedMessage, iv } = encryptMessage(message, sharedSecret);
    
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
        const member = await User.findById(sampleMessage.memberId).select('keys');
        const memberKey = member.keys.find(
          (key) => key._id.toString() === sampleMessage.memberActiveKeyId.toString()
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
          message: decryptedMessage,
          sender,
          groupId,
        };

        members.forEach((memberId) => {
          const socketId = userSocketMap.get(memberId.toString());
          if (socketId) {
            io.to(socketId).emit('receivedGroupMessage', responsePayload);
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
    
            const user = await User.findById(userId).select("_id username avatar")
            if (!user) {
              console.error(error);
              return  
            }

            const adderUser = await User.findById(requestUser);
            if (!adderUser) {
              console.error(error);
              return  
            }
            const group = await Group.findById(groupId)

            if (!group) {
              console.error(error);
              return  
            }

            if (!Array.isArray(user.connectedGroups)) {
              user.connectedGroups = [];
            }

            group.members.push(user._id);
            user.connectedGroups.push(group._id);
            await group.save();
            await user.save();

            const groupNow = await Group.findById(groupId)
              .populate({
                  path: 'members',  
                  select: '_id username avatar' 
              })
          
            group.members.forEach(memberId => {
                if (userSocketMap.has(memberId.toString())) {
                    const socketId = userSocketMap.get(memberId.toString()); 
                    io.to(socketId).emit('newMemberAdded', {
                        groupNow,
                        user,
                        userToAddId:userId
                    });
                }
            });
    
        } catch (error) {
            console.error(error);
        }
    };
  

    const handleAddConnection = async (connection) => {
      const { sender, recipient } = connection;
    
      try {
        if (!sender || !recipient) {
          console.error("Sender or recipient ID is missing");
          return;
        }
    
        const senderUser = await User.findById(sender)
          .select('username avatar _id keys activeKeyId connectedPeoples');
    
        if (!senderUser) {
          console.error("Sender user not found");
          return;
        }
    
        const recipientUser = await User.findById(recipient)
          .select('username avatar _id keys activeKeyId connectedPeoples');
    
        if (!recipientUser) {
          console.error("Recipient user not found");
          return;
        }
    
        const chat = new Chat({
          members: [recipient, sender],
        });
    
        await chat.save();
    
        if (!senderUser.connectedPeoples.some(cp => cp.userId.toString() === recipient.toString())) {
          senderUser.connectedPeoples.push({ userId: recipient, chatId: chat._id });
          await senderUser.save();
        }
    
        if (!recipientUser.connectedPeoples.some(cp => cp.userId.toString() === sender.toString())) {
          recipientUser.connectedPeoples.push({ userId: sender, chatId: chat._id });
          await recipientUser.save();
        }

        const recipientSocketId = userSocketMap.get(recipient);
        const senderSocketId = userSocketMap.get(sender);
    
        senderUser.keys = senderUser.keys.map(key => ({
          publicKey: key.publicKey,
          _id: key._id,
        }));
    
        recipientUser.keys = recipientUser.keys.map(key => ({
          publicKey: key.publicKey,
          _id: key._id,
        }));

        const connectionMessage = {
          sender: {
            userId: {
              _id: senderUser._id,
              username: senderUser.username,
              avatar: senderUser.avatar,
              keys: senderUser.keys,
              activeKeyId: senderUser.activeKeyId,
            },
            chatId: chat._id,
            _id: crypto.randomUUID(), 
          },
          recipient: {
            userId: {
              _id: recipientUser._id,
              username: recipientUser.username,
              avatar: recipientUser.avatar,
              keys: recipientUser.keys,
              activeKeyId: recipientUser.activeKeyId,
            },
            chatId: chat._id,
            _id: crypto.randomUUID(),
            
          },
          message: "New connection established!",
        };

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("connectionUpdated", connectionMessage);
        }
        if (senderSocketId) {
          io.to(senderSocketId).emit("connectionUpdated", connectionMessage);
        }
      } catch (error) {
        console.error("Error adding connection:", error);
      }
    };
    
    const handleremoveConnection = async (request) => {
        try {
            const senderUser = await User.findById(request.sender).select('connectedPeoples');
            if (!senderUser) {
                console.error("Sender user not found");
                return;
            }
    
            const recipientUser = await User.findById(request.recipient).select('connectedPeoples');
            if (!recipientUser) {
                console.error("Recipient user not found");
                return;
            }
    
            senderUser.connectedPeoples = senderUser.connectedPeoples.filter(
                (connection) => connection.userId.toString() !== request.recipient
            );
    
            recipientUser.connectedPeoples = recipientUser.connectedPeoples.filter(
                (connection) => connection.userId.toString() !== request.sender
            );
    
            await senderUser.save();
            await recipientUser.save();
            
            const chat = await Chat.findOne({
              members: { $all: [request.sender, request.recipient] },
            });
    
            if (chat) {
                await Message.deleteMany({ chatId: chat._id });
                await Chat.deleteMany({_id: chat._id});
            }

            const recipientSocketId = userSocketMap.get(request.recipient);
            const senderSocketId = userSocketMap.get(request.sender);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("connectionRemoved", request.sender);
            }
    
            if (senderSocketId) {
                io.to(senderSocketId).emit("connectionRemoved", request.recipient);
            }
        } catch (error) {
            console.error("Error handling connection removal:", error.message);
        }
    };
  

    io.on("connection",(socket)=>{
        const userId = socket.handshake.query.userId;
        if(userId){
            userSocketMap.set(userId,socket.id);
            console.log(`user connected: ${userId} with socketID: ${socket.id}`)
        }else{
            console.log("User id is not provided during connection")
        }

        socket.on("removeConnection",handleremoveConnection)
        socket.on("sendConnection",handleAddConnection)
        socket.on("addMemberToGroup",handleAddMemberToGroup)
        socket.on("sendMessageGroup",sendMessageGroup)
        socket.on("sendMessage",sendMessage)
        socket.on("disconnect",()=>disconnect(socket))
    })
}


export default setUpSocket