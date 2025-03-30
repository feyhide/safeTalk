/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import { DOMAIN } from "../constant/constant";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/utils";
import { useSocket } from "../context/SocketContext";

const ChatInfo = ({ chatId, currentUser, hideFunc }) => {
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socket = useSocket();

  const fetchChatInfo = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${DOMAIN}api/v1/chat/get-chat-info?chatId=${chatId}`,
        { withCredentials: true }
      );

      if (data.success) {
        console.log(data.data);
        setChatInfo(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error(error);
      setError("Failed to fetch chat info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chatId) fetchChatInfo();
  }, [chatId]);

  const handleRemoveFriend = () => {
    socket.emit("removeFriend", {
      sender: currentUser._id,
      chatId: chatId,
    });
  };

  return (
    <div className="w-full h-full font-slim  text-white flex p-2 flex-col items-center justify-center relative">
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="w-full h-full flex flex-col justify-between items-center">
          <div className="w-full h-[10%] p-2">
            <img
              onClick={() => hideFunc(false)}
              src="/icons/cross.png"
              className="w-8 h-8"
            />
          </div>
          <div className="w-full h-[80%] gap-2 text-md flex flex-col items-center justify-center">
            {chatInfo &&
              chatInfo.members.length === 2 &&
              chatInfo.members
                .filter((member) => member._id !== currentUser._id)
                .map((member) => (
                  <div key={member._id} className="flex flex-col items-center">
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className="w-16 h-16 rounded-full object-cover border-2 border-white"
                    />
                    <p className="mt-2 text-white">{member.username}</p>
                  </div>
                ))}
            {chatInfo && chatInfo.members.length !== 2 && (
              <div className="flex flex-col items-center">
                <img
                  src={chatInfo.pastMembers?.[0]?.avatar}
                  alt={chatInfo.pastMembers?.[0]?.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
                <p className="mt-2 text-white">
                  {chatInfo.pastMembers?.[0]?.username}
                </p>
              </div>
            )}
            <div className="w-full flex gap-2 flex-col items-center justify-center">
              <button
                onClick={handleRemoveFriend}
                className="bg-red-500 p-2 rounded-xl"
              >
                Remove Friend
              </button>
              <p className="text-center text-xs">
                <span>📌</span>
                Removing a friend won’t delete your chat unless they remove you
                too. If they re-add you, the chat restores.
              </p>
            </div>
          </div>
          <div className="w-full h-[10%] text-sm flex flex-col items-center justity-center">
            <p
              className={`${
                chatInfo && chatInfo.members.length !== 2 && " line-through"
              }`}
            >
              Together Since
            </p>
            <p
              className={`${
                chatInfo && chatInfo.members.length !== 2 && " line-through"
              }`}
            >
              {formatDate(chatInfo.createdAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInfo;
