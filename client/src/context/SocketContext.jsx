/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { appendMessage, resetChat } from "../redux/chatSlice.js";
import { appendMember, appendMessageGroup } from "../redux/groupSlice.js";
import { HOST } from "../constant/constant.js";
import {
  appendConnection,
  removeConnection,
  updateConnectedGroup,
} from "../redux/connectedSlice.js";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isSocketReady, setSocketReady] = useState(false);
  const socket = useRef(null);
  const { currentUser } = useSelector((state) => state.user);
  const { selectedChat } = useSelector((state) => state.chat);
  const { selectedgroup } = useSelector((state) => state.group);
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
        return selectedChat && selectedChat._id === messagePayload.chatId;
      };

      const isMessageForSelectedGroup = (messagePayload) => {
        return selectedgroup && selectedgroup._id === messagePayload.groupId;
      };

      const handleReceivedMessage = (messagePayload) => {
        if (isMessageForSelectedChat(messagePayload)) {
          dispatch(appendMessage(messagePayload));
        }
      };

      const receivedGroupMessage = (messagePayload) => {
        if (isMessageForSelectedGroup(messagePayload)) {
          dispatch(appendMessageGroup(messagePayload));
        }
      };

      const handleConnectionUpdated = (connection) => {
        console.log(connection);
        dispatch(appendConnection(connection));
      };

      const handleMemberAdded = (request) => {
        console.log(request);
        if (selectedgroup._id === request.groupId) {
          dispatch(appendMember(request.addedUser));
        }
        dispatch(updateConnectedGroup(request));
      };

      const connectionRemoved = (request) => {
        console.log(request);
        if (selectedChat && selectedChat.userId._id === request) {
          dispatch(resetChat());
        }
        dispatch(removeConnection(request));
      };

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
  }, [selectedChat, selectedgroup, currentUser]);

  return (
    <SocketContext.Provider value={isSocketReady ? socket.current : null}>
      {children}
    </SocketContext.Provider>
  );
};
