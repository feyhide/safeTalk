/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appendOlderMessages, refreshChat, reset } from "../redux/chatSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import { resetGroup } from "../redux/groupSlice.js";
import { DOMAIN } from "../constant/constant.js";
import { resetUser } from "../redux/userSlice.js";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersection } from "@mantine/hooks";
import axios from "axios";

const MessageBox = () => {
  // window.addEventListener("beforeunload", (event) => {
  //   dispatch(reset());
  // });
  const socket = useSocket();
  const { selectedChat, chatData } = useSelector((state) => state.chat);
  const { currentUser } = useSelector((state) => state.user);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const chatContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["chat", selectedChat.chatId],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await axios.get(
          `${DOMAIN}api/v1/chat/get-messages?chat=${selectedChat.chatId}&page=${pageParam}`,
          { withCredentials: true }
        );
        console.log(data);
        return data.success ? data : { data: [], totalPages: 1 };
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const nextPage = allPages.length + 1;
        return nextPage <= lastPage.totalPages ? nextPage : undefined;
      },
      enabled: !!selectedChat.chatId,
    });

  const { ref, entry } = useIntersection({ root: null, threshold: 1 });

  useEffect(() => {
    if (selectedChat && entry?.isIntersecting && hasNextPage) {
      console.log("fetching next");
      fetchNextPage();
    }
  }, [selectedChat, entry, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (!chatContainerRef.current || !data) return;

    const chatBox = chatContainerRef.current;

    if (data.pages.length === 1) {
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeightRef.current;
    }

    prevScrollHeightRef.current = chatBox.scrollHeight;
  }, [data]);

  const handleSendMessage = () => {
    if (selectedChat && message.trim()) {
      const senderActiveKeyId = currentUser.activeKeyId;
      const activeSenderPrivateKey = currentUser.keys.find(
        (key) => key._id.toString() === senderActiveKeyId.toString()
      );

      const recipientActiveKeyId = selectedChat.userId.activeKeyId;
      const activeRecipientPublicKey = selectedChat.userId.keys.find(
        (key) => key._id.toString() === recipientActiveKeyId.toString()
      );

      socket.emit("sendMessage", {
        sender: currentUser._id,
        recipient: selectedChat.userId._id,
        chatId: selectedChat.chatId,
        message: message.trim(),
        senderPvtKey: activeSenderPrivateKey,
        recipientPbcKey: activeRecipientPublicKey,
      });
      setMessage("");
    }
  };

  useEffect(() => {
    dispatch(refreshChat());
  }, [selectedChat]);

  const handleCloseChat = () => {
    dispatch(reset());
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      <div className="w-full h-auto text-black px-2 pt-2 flex items-center justify-center">
        <div className="font-slim bg-white flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[8vh]">
          <img
            onClick={handleCloseChat}
            src="/icons/back.png"
            className="flex lg:hidden w-8 h-8"
          />
          <img
            src={selectedChat.userId.avatar}
            className="w-8 h-8 rounded-full bg-black bg-opacity-50 border-2"
          />
          <p className="text-base">{selectedChat.userId.username}</p>
        </div>
      </div>
      <div className="p-1 w-full h-full">
        <div
          ref={chatContainerRef}
          className="w-full overflow-y-auto overflow-x-hidden customScroll px-2 h-[77svh]"
        >
          {isFetchingNextPage && (
            <div className="text-center text-white text-sm mb-2">
              Fetching more...
            </div>
          )}
          {data?.pages
            .flatMap((group) => group.data) // Flatten all pages into a single array
            .reverse() // Reverse to show new messages at the bottom
            .map((msg, index) => {
              const isFirstItem = index === 0; // First item in reversed list
              if (isFirstItem) {
                console.log("message to which tig", msg);
              }
              return (
                <div
                  ref={isFirstItem ? ref : null} // Trigger loading more when first message is visible
                  key={msg._id}
                  className={`flex items-center gap-2 w-full h-auto ${
                    msg.sender === currentUser._id
                      ? "justify-end"
                      : "justify-start"
                  } mb-4`}
                >
                  {msg.sender !== currentUser._id && (
                    <img
                      src={selectedChat.userId.avatar}
                      className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                    />
                  )}
                  <div
                    className={`max-w-[50%] lg:max-w-1/2 p-2 rounded-lg ${
                      msg.sender === currentUser._id
                        ? "bg-white text-black bg-opacity-50"
                        : "bg-white"
                    }`}
                  >
                    <p className="w-auto text-sm break-words font-slim whitespace-normal">
                      {msg.message}
                    </p>
                  </div>
                  {msg.sender === currentUser._id && (
                    <img
                      src={currentUser.avatar}
                      className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>
      <div className="w-full min-h-[10svh] h-auto flex items-center absolute bottom-0 p-2">
        <div className="font-slim bg-white rounded-xl text-white flex justify-between gap-2 items-center w-full h-full">
          <textarea
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            placeholder="Message"
            className="w-[90%] text-black p-2 outline-none bg-transparent resize-none"
            style={{ minHeight: "100%", maxHeight: "20svh", overflowY: "auto" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(
                e.target.scrollHeight,
                e.target.offsetHeight + 150
              )}px`;
            }}
          />
          <div className="w-[10%] flex items-center justify-center">
            <img
              onClick={handleSendMessage}
              src="/icons/send.png"
              className="w-8 h-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBox;
