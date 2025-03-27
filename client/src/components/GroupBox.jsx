import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  appendOlderMessagesGroup,
  refreshgroup,
  resetGroup,
  updatePageAndTotal,
} from "../redux/groupSlice.js";
import { reset } from "../redux/chatSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import SearchMemberToAdd from "./SearchMemberToAdd.jsx";
import { DOMAIN } from "../constant/constant.js";
import { resetUser } from "../redux/userSlice.js";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useIntersection } from "@mantine/hooks";
import axios from "axios";

const GroupBox = () => {
  const socket = useSocket();

  const { selectedgroup, groupData } = useSelector((state) => state.group);
  const [addMember, setAddMember] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const chatContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["group", selectedgroup._id],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await axios.get(
          `${DOMAIN}api/v1/group/get-messages?group=${selectedgroup._id}&page=${pageParam}`,
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
      enabled: !!selectedgroup._id,
    });

  const { ref, entry } = useIntersection({ root: null, threshold: 1 });

  useEffect(() => {
    if (selectedgroup?._id && entry?.isIntersecting && hasNextPage) {
      console.log("fetching next");
      fetchNextPage();
    }
  }, [selectedgroup?._id, entry, hasNextPage, fetchNextPage]);

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
    if (selectedgroup && message.trim()) {
      const memberIds = selectedgroup.members.map((member) => member._id);
      socket.emit("sendMessageGroup", {
        sender: currentUser._id,
        members: memberIds,
        groupId: selectedgroup._id,
        message: message.trim(),
      });
      setMessage("");
    }
  };

  const handleCloseGroup = () => {
    dispatch(resetGroup());
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {addMember && <SearchMemberToAdd setAddMember={setAddMember} />}
      <div className="w-full h-[10svh] text-black p-2 flex items-center justify-center">
        <div className="font-slim relative bg-white flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[100%]">
          <img
            onClick={handleCloseGroup}
            src="/icons/back.png"
            className="flex lg:hidden w-8 h-8"
          />
          <div className="relative flex -space-x-7">
            {selectedgroup &&
              selectedgroup.members
                .slice(0, 4)
                .map((member, index) => (
                  <img
                    key={index}
                    src={member.avatar}
                    alt="Avatar"
                    className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2 border-white"
                    style={{ zIndex: selectedgroup.members.length + index }}
                  />
                ))}
          </div>
          <p className="text-base">{selectedgroup.groupName}</p>
          <img
            onClick={() => setAddMember(true)}
            src="/icons/addblack.png"
            className="w-6 h-6 absolute right-5"
          />
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
              const sender = selectedgroup.members.find(
                (member) => member._id === msg.sender
              );
              return (
                <div
                  ref={isFirstItem ? ref : null} // Trigger loading more when first message is visible
                  key={msg._id}
                  className={`flex font-slim gap-2 w-full h-auto ${
                    msg.sender === currentUser._id
                      ? "justify-end"
                      : "justify-start"
                  } mb-4`}
                >
                  {msg.sender !== currentUser._id && sender && (
                    <img
                      src={sender.avatar}
                      alt="Sender Avatar"
                      className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                    />
                  )}
                  <div className="max-w-[50%] lg:max-w-1/2 ">
                    {msg.sender !== currentUser._id && sender && (
                      <p className="text-xs lg:text-sm text-white">
                        {sender.username}
                      </p>
                    )}
                    <div
                      className={`max-w-[100%] lg:max-w-1/2 p-2 rounded-lg ${
                        msg.sender === currentUser._id
                          ? "bg-white text-black bg-opacity-50"
                          : "bg-white"
                      }`}
                    >
                      <p className="w-auto text-sm lg:text-lg break-words whitespace-normal">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                  {msg.sender === currentUser._id && (
                    <img
                      src={currentUser.avatar}
                      className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                      alt="Your Avatar"
                    />
                  )}
                </div>
              );
            })}

          {groupData.map((msg, index) => {
            const sender = selectedgroup.members.find(
              (member) => member._id === msg.sender
            );
            return (
              <div
                key={index}
                className={`flex font-slim gap-2 w-full h-auto ${
                  msg.sender === currentUser._id
                    ? "justify-end"
                    : "justify-start"
                } mb-4`}
              >
                {msg.sender !== currentUser._id && sender && (
                  <img
                    src={sender.avatar}
                    alt="Sender Avatar"
                    className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                  />
                )}
                <div className="max-w-[50%] lg:max-w-1/2 ">
                  {msg.sender !== currentUser._id && sender && (
                    <p className="text-xs lg:text-sm text-white">
                      {sender.username}
                    </p>
                  )}
                  <div
                    className={`max-w-[100%] lg:max-w-1/2 p-2 rounded-lg ${
                      msg.sender === currentUser._id
                        ? "bg-white text-black bg-opacity-50"
                        : "bg-white"
                    }`}
                  >
                    <p className="w-auto text-sm lg:text-lg break-words whitespace-normal">
                      {msg.message}
                    </p>
                  </div>
                </div>
                {msg.sender === currentUser._id && (
                  <img
                    src={currentUser.avatar}
                    className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                    alt="Your Avatar"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="w-full min-h-[10svh] h-auto flex items-center absolute bottom-0 p-2">
        <div className="font-slim bg-white rounded-xl bg-opacity-90 text-white flex justify-between gap-2 items-center w-full h-full">
          <textarea
            onChange={(e) => setMessage(e.target.value)}
            value={message}
            placeholder="Message"
            className="w-[90%] text-black p-2 outline-none bg-transparent resize-none"
            style={{ minHeight: "100%", maxHeight: "20svh", overflowY: "auto" }}
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

export default GroupBox;
