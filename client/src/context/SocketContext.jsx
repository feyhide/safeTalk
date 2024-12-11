import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { appendMessage } from "../redux/chatSlice.js";
import { appendConnection, appendGroup, removeConnection, updateConnectedGroup } from "../redux/userSlice.js";
import { appendMember, appendMessageGroup } from "../redux/groupSlice.js";
import {HOST} from '../constant/constant.js'

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [isSocketReady, setSocketReady] = useState(false);
    const socket = useRef(null);
    const { currentUser } = useSelector(state => state.user);
    const { selectedChat } = useSelector(state => state.chat);
    const { selectedgroup } = useSelector(state => state.group);
    const dispatch = useDispatch();
    const prod = true;
    
    useEffect(() => {
        if (currentUser) {
            socket.current = io(HOST, {
                withCredentials: true,
                query: { userId: currentUser._id },
            });

            socket.current.on("connect", () => {
                console.log("Connected to socket server");
                setSocketReady(true);
            });

            socket.current.on("connect_error", (error) => {
                console.error("Socket connection error:", error);
                setSocketReady(false);
            });

            socket.current.on("disconnect", () => {
                console.log("Disconnected from socket server");
                setSocketReady(false);
            });

            return () => {
                if (socket.current) {
                    socket.current.disconnect();
                    console.log("Socket disconnected");
                }
            };
        }
    }, [currentUser]);

    useEffect(() => {
        if (socket.current && currentUser) {
            const isMessageForSelectedChat = (messagePayload) => {
                return selectedChat &&
                    ((selectedChat.userId._id === messagePayload.sender && currentUser._id === messagePayload.recipient) ||
                     (selectedChat.userId._id === messagePayload.recipient && currentUser._id === messagePayload.sender));
            };
            const isMessageForSelectedGroup = (messagePayload) => {
                return selectedgroup && selectedgroup._id === messagePayload.groupId
            };

            const handleReceivedMessage = (messagePayload) => {
                const { messageEncrypted, iv, sender, recipient,senderKeyId, recipientKeyId } = messagePayload;
                if (isMessageForSelectedChat(messagePayload)) {
                    dispatch(appendMessage(messagePayload));
                }
            };

            const receivedGroupMessage = (messagePayload) => {
                const { message, sender, groupId} = messagePayload;
                if (isMessageForSelectedGroup(messagePayload)) {
                    dispatch(appendMessageGroup(messagePayload));
                }
            };

            const handleConnectionUpdated = (connection) => {
                console.log(connection)
                if (currentUser._id === connection.sender.userId._id) {
                    dispatch(appendConnection(connection.recipient));
                } else if (currentUser._id === connection.recipient.userId._id) {
                    dispatch(appendConnection(connection.sender));
                }
            };

            const handleMemberAdded = (request) => {
                console.log(request);
                if (currentUser._id === request.user._id) {
                    dispatch(appendGroup(request.groupNow));
                }
                if (currentUser._id !== request.userToAddId){
                    dispatch(appendMember(request.user));
                    dispatch(updateConnectedGroup(request.groupNow))
                }
            }

            const connectionRemoved = (request) => {
                dispatch(removeConnection(request))
            }
            
            socket.current.on("connectionRemoved", connectionRemoved);
            socket.current.on("receivedMessage", handleReceivedMessage);
            socket.current.on("connectionUpdated", handleConnectionUpdated);
            socket.current.on("newMemberAdded", handleMemberAdded);
            socket.current.on("receivedGroupMessage", receivedGroupMessage);
                
            return () => {
                socket.current.off("connectionRemoved", connectionRemoved);
                socket.current.off("receivedGroupMessage", receivedGroupMessage);
                socket.current.off("newMemberAdded", handleMemberAdded);
                socket.current.off("receivedMessage", handleReceivedMessage);
                socket.current.off("connectionUpdated", handleConnectionUpdated);
            };
        }
    }, [selectedChat,selectedgroup, currentUser]);

    return (
        <SocketContext.Provider value={isSocketReady ? socket.current : null}>
            {children}
        </SocketContext.Provider>
    );
};
