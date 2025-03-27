import NoChatSelected from "./NoChatSelected";
import MessageBox from "./MessageBox";
import { useSelector } from "react-redux";
import GroupBox from "./GroupBox";

const ChatBox = () => {
  const { selectedChat } = useSelector((state) => state.chat);
  const { selectedgroup } = useSelector((state) => state.group);

  return (
    <div className="w-screen flex flex-col lg:w-[70%] items-center justify-center h-screen bg-white">
      <div className="w-[90vw] flex flex-col lg:w-[95%] h-[95%] rounded-xl bg-blue-400 bg-opacity-90">
        {selectedgroup ? (
          <GroupBox />
        ) : selectedChat ? (
          <MessageBox />
        ) : (
          <NoChatSelected />
        )}
      </div>
    </div>
  );
};

export default ChatBox;
