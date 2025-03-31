/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appendOlderMessagesGroup, resetGroup } from "../redux/groupSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import SearchMemberToAdd from "./SearchMemberToAdd.jsx";
import { DOMAIN } from "../constant/constant.js";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useIntersection } from "@mantine/hooks";
import axios from "axios";
import { formatDayTime } from "../utils/utils.js";
import GroupInfo from "./GroupInfo.jsx";

const GroupBox = () => {
  const socket = useSocket();
  const [groupInfo, setGroupInfo] = useState(false);
  const { selectedgroup, groupData } = useSelector((state) => state.group);
  const [addMember, setAddMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const chatContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedgroup._id) {
      queryClient.removeQueries(["group"]);
    }
  }, [selectedgroup._id]);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["group", selectedgroup._id],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await axios.get(
          `${DOMAIN}api/v1/group/get-messages?group=${selectedgroup._id}&page=${pageParam}`,
          { withCredentials: true }
        );

        if (data.success) {
          dispatch(
            appendOlderMessagesGroup({
              messages: data.data,
              page: pageParam,
            })
          );
          return data.success ? data : { data: [], totalPages: 1 };
        }
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
    if (selectedgroup && entry?.isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [selectedgroup, entry, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (!chatContainerRef.current || !data) return;

    const chatBox = chatContainerRef.current;

    setTimeout(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);

    prevScrollHeightRef.current = chatBox.scrollHeight;
  }, [groupData?.[0]?.messages?.length]);

  useEffect(() => {
    if (!chatContainerRef.current || !data) return;

    const chatBox = chatContainerRef.current;

    if (data.pages.length === 1) {
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeightRef.current;
    }

    prevScrollHeightRef.current = chatBox.scrollHeight;
  }, [groupData?.length]);

  const handleSendMessage = () => {
    if (selectedgroup && message.trim()) {
      let memberIds = selectedgroup.members.map((member) => member.user._id);
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

  useEffect(() => {
    let member = selectedgroup?.members.find(
      (member) => member.user._id === currentUser._id
    );

    if (member?.role === "admin") {
      setIsAdmin(true);
    }
  }, [selectedgroup]);

  return groupInfo ? (
    <GroupInfo
      selectedGroup={selectedgroup}
      hideFunc={setGroupInfo}
      currentUser={currentUser}
    />
  ) : (
    <div className="w-full h-full flex flex-col relative">
      {addMember && <SearchMemberToAdd setAddMember={setAddMember} />}
      <div className="w-full h-[10svh] text-black px-2 pt-2 flex items-center justify-center">
        <div className="font-slim relative bg-white/20 flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[100%]">
          <img
            onClick={handleCloseGroup}
            src="/icons/back.png"
            className="flex lg:hidden w-8 h-8"
          />
          <div
            onClick={() => setGroupInfo(true)}
            className="flex items-center justify-center text-white"
          >
            <div className="relative flex -space-x-7 z-10">
              {selectedgroup &&
                selectedgroup.members
                  .slice(0, 4)
                  .map((member, index) => (
                    <img
                      key={index}
                      src={member.user.avatar}
                      alt="Avatar"
                      className=" w-8 h-8 bg-black bg-opacity-50 rounded-full border-2 border-white"
                      style={{ zIndex: selectedgroup.members.length + index }}
                    />
                  ))}
            </div>
            <p className="bg-blue-400 rounded-r-xl shadow-md -ml-1 px-2">
              {selectedgroup.groupName}
            </p>
          </div>
          {isAdmin && (
            <img
              onClick={() => setAddMember(true)}
              src="/icons/addblack.png"
              className="w-6 h-6 absolute right-5"
            />
          )}
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
          {groupData
            .flatMap((group) => group.messages)
            .reverse()
            .map((msg, index) => {
              const isFirstItem = index === 0;
              let pastUser = false;
              let sender = selectedgroup.members.find(
                (member) => member.user._id === msg.sender
              );

              if (!sender) {
                pastUser = true;
                sender = selectedgroup.pastMembers.find(
                  (member) => member._id === msg.sender
                );
              }

              return (
                <div
                  ref={isFirstItem ? ref : null}
                  key={msg._id}
                  className={`flex font-slim gap-2 w-full h-auto ${
                    msg.sender === currentUser._id
                      ? "justify-end"
                      : "justify-start"
                  } mb-4`}
                >
                  {msg.sender !== currentUser._id && sender && (
                    <img
                      src={pastUser ? sender.avatar : sender.user.avatar}
                      alt="Sender Avatar"
                      className={`h-8 rounded-full bg-black bg-opacity-50 border-2  ${
                        pastUser ? "border-white/50" : "border-white"
                      } `}
                    />
                  )}
                  <div className={`max-w-[50%] lg:max-w-1/2 `}>
                    {msg.sender !== currentUser._id && sender && (
                      <p
                        className={`text-xs lg:text-sm ${
                          pastUser ? "text-white/50" : "text-white"
                        } `}
                      >
                        {pastUser ? sender.username : sender.user.username}
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
                      <p
                        className={`text-[10px] w-full ${
                          msg.sender === currentUser._id
                            ? "text-end"
                            : "text-start"
                        }`}
                      >
                        {formatDayTime(msg.createdAt)}
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
