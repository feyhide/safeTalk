/* eslint-disable react/prop-types */
import { formatDate } from "../utils/utils";
import { useSocket } from "../context/SocketContext";

const ChatInfo = ({ selectedChat, currentUser, hideFunc }) => {
  const socket = useSocket();

  const handleRemoveFriend = () => {
    socket.emit("removeFriend", {
      sender: currentUser._id,
      chatId: selectedChat._id,
    });
  };

  return (
    <div className="w-full h-full font-slim  text-white flex p-2 flex-col items-center justify-center relative">
      <div className="w-full h-full flex flex-col justify-between items-center">
        <div className="w-full h-[10%] p-2">
          <img
            onClick={() => hideFunc(false)}
            src="/icons/cross.png"
            className="w-8 h-8"
          />
        </div>
        <div className="w-full h-[80%] gap-2 text-md flex flex-col items-center justify-center">
          {selectedChat &&
            selectedChat.members.length === 2 &&
            selectedChat.members
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
          {selectedChat && selectedChat.members.length !== 2 && (
            <div className="flex flex-col items-center">
              <img
                src={selectedChat.pastMembers?.[0]?.avatar}
                alt={selectedChat.pastMembers?.[0]?.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-white"
              />
              <p className="mt-2 text-white">
                {selectedChat.pastMembers?.[0]?.username}
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
              selectedChat &&
              selectedChat.members.length !== 2 &&
              " line-through"
            }`}
          >
            Together Since
          </p>
          <p
            className={`${
              selectedChat &&
              selectedChat.members.length !== 2 &&
              " line-through"
            }`}
          >
            {formatDate(selectedChat.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInfo;
