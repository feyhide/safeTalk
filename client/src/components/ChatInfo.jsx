/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import { DOMAIN } from "../constant/constant";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/utils";

const ChatInfo = ({ chatId, currentUser, hideFunc }) => {
  const [chatInfo, setChatInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          <div className="w-full h-[80%] text-md flex flex-col items-center justify-center">
            {chatInfo &&
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
          </div>
          <div className="w-full h-[10%] text-sm flex flex-col items-center justity-center">
            <p>Friends Since</p>
            <p>{formatDate(chatInfo.createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInfo;
