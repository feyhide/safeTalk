/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import {
  appendMessage,
  resetChat,
  updateSelectedChat,
} from "../redux/chatSlice.js";
import {
  appendMessageGroup,
  resetGroup,
  updateSelectedGroup,
} from "../redux/groupSlice.js";
import { HOST } from "../constant/constant.js";
import {
  appendConnection,
  removeFromConnectedGroup,
  removeFromConnectedPeople,
  updateConnectedGroup,
  updateConnectedPeople,
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
        if (connection.status === "New") {
          dispatch(appendConnection(connection.data));
        } else {
          if (currentUser._id === connection.sender) {
            dispatch(updateSelectedChat(connection.data));
            dispatch(updateConnectedPeople({ updatedChat: connection.data }));
          } else {
            dispatch(appendConnection(connection.data));
          }
        }
      };

      const handleMemberAdded = (request) => {
        console.log(request);
        if (selectedgroup && selectedgroup._id === request.groupId) {
          dispatch(updateSelectedGroup(request.updatedGroup));
        }
        dispatch(updateConnectedGroup(request));
      };

      const connectionRemoved = (request) => {
        switch (request.status) {
          case "chatRemoved":
            if (selectedChat && selectedChat._id === request.chatId) {
              dispatch(resetChat());
            }
            dispatch(removeFromConnectedPeople({ chatId: request.chatId }));
            break;
          case "memberLeaved":
            if (currentUser._id === request.memberLeaved) {
              console.log("i leaved");
              if (selectedChat && selectedChat._id === request.data._id) {
                dispatch(resetChat());
              }
              dispatch(
                removeFromConnectedPeople({
                  chatId: request.data._id,
                })
              );
            } else {
              console.log("i dont leaved");
              if (selectedChat && selectedChat._id === request.data._id) {
                dispatch(updateSelectedChat(request.data));
              }
              dispatch(updateConnectedPeople({ updatedChat: request.data }));
            }
            break;
          default:
            break;
        }
      };

      const handleRemovedMember = (request) => {
        console.log(request);

        if (currentUser._id === request.removedUser) {
          if (selectedgroup && selectedgroup._id === request.groupId) {
            dispatch(resetGroup());
          }
          dispatch(removeFromConnectedGroup(request));
        } else {
          if (selectedgroup && selectedgroup._id === request.groupId) {
            dispatch(updateSelectedGroup(request.updatedGroup));
          }
          dispatch(updateConnectedGroup(request));
        }
      };

      const handleLeavedGroup = (request) => {
        console.log(request);

        switch (request.status) {
          case "GroupDeleted":
            if (selectedgroup && selectedgroup._id === request.groupId) {
              dispatch(resetGroup());
            }
            dispatch(removeFromConnectedGroup(request));
            break;
          case "MemberLeaved":
            if (currentUser._id === request.removedMember) {
              if (selectedgroup && selectedgroup._id === request.groupId) {
                dispatch(resetGroup());
              }
              dispatch(removeFromConnectedGroup(request));
            } else {
              if (selectedgroup && selectedgroup._id === request.groupId) {
                dispatch(updateSelectedGroup(request.updatedGroup));
              }
              dispatch(updateConnectedGroup(request));
            }
            break;
          default:
            console.log(request.message);
            break;
        }
      };

      const handleChangedRole = (request) => {
        console.log("changerole", request);
        if (selectedgroup && selectedgroup._id === request.groupId) {
          dispatch(updateSelectedGroup(request.updatedGroup));
        }
        dispatch(updateConnectedGroup(request));
      };

      socket.current.on("changedRole", handleChangedRole);
      socket.current.on("leavedGroup", handleLeavedGroup);
      socket.current.on("connectionRemoved", connectionRemoved);
      socket.current.on("removedMember", handleRemovedMember);
      socket.current.on("receivedMessage", handleReceivedMessage);
      socket.current.on("connectionUpdated", handleConnectionUpdated);
      socket.current.on("newMemberAdded", handleMemberAdded);
      socket.current.on("receivedGroupMessage", receivedGroupMessage);

      return () => {
        socket.current.off("changedRole", handleChangedRole);
        socket.current.off("leavedGroup", handleLeavedGroup);
        socket.current.off("connectionRemoved", connectionRemoved);
        socket.current.off("removedMember", handleRemovedMember);
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
