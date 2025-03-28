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
            {/* <div className="w-full h-[60%] relative p-2 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center w-full p-2 h-[100%] relative rounded-xl bg-white/20 shadow-md">
                <p>Members</p>
                <div className="w-full h-[90%] overflow-y-auto customScroll flex flex-col gap-2">
                  {chatInfo &&
                    chatInfo.members.map((member, index) => (
                      <div key={index} className="w-full flex items-center">
                        <img
                          key={index}
                          src={member.avatar}
                          alt="Avatar"
                          className="w-10 h-10 z-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                        />
                        <p className="bg-blue-400 shadow-md rounded-r-xl -ml-1 px-2">
                          {member.username}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div> */}
            <div className="w-full h-[10%] flex items-center justify-center">
              <p className="bg-red-500 p-2 rounded-xl">Remove Friend</p>
            </div>
          </div>
          <div className="w-full h-[10%] text-sm flex flex-col items-center justity-center">
            <p>Together Since</p>
            <p>{formatDate(chatInfo.createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInfo;
