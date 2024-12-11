import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appendOlderMessagesGroup, refreshgroup, resetGroup, updatePageAndTotal } from "../redux/groupSlice.js";
import { refreshChat, reset } from "../redux/chatSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import InfiniteScroll from "react-infinite-scroll-component";
import SearchMemberToAdd from "./SearchMemberToAdd.jsx";
import { DOMAIN } from "../constant/constant.js";
import { resetUser } from "../redux/userSlice.js";

const GroupBox = () => {
    window.addEventListener('beforeunload', (event) => {
        dispatch(resetGroup())
    });

    const { selectedgroup, groupData, page, total } = useSelector((state) => state.group);
    const { currentUser } = useSelector((state) => state.user);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [addMember, setAddMember] = useState(false);
    const dispatch = useDispatch();
    const [scroll,setScroll] = useState(true);
    const chatContainerRef = useRef(null);
    const endofMessage = useRef(null); 
    let index = 0;

    useEffect(()=>{
        if(scroll){
            endofMessage.current?.scrollIntoView()
        }
    },[groupData])

    const fetchMessages = async () => {
        if (loading) return;
        if (page >= total && page != 0 && total != 0){
            return
        }
        setLoading(true);
        try {
            const res = await fetch(DOMAIN+`api/v1/group/get-messages`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    groupId: selectedgroup._id,
                    page:page+1,
                    limit: 15,
                }),
            });
            if (res.status === 401) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if(page+1 === 1){
                dispatch(refreshgroup())
            }
            const data = await res.json();
            if (res.status === 401) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if (res.ok) {
                dispatch(appendOlderMessagesGroup(data.messages)); 
                dispatch(updatePageAndTotal({page:data.pagination.page,total:data.pagination.totalPages}))
            } else {
                console.error("Failed to fetch group messages:", data);
            }
        } catch (error) {
            console.error("Error fetching group messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMoreData = () => {
        setScroll(false)
        fetchMessages(page+1);
    };

    useEffect(() => {
        if (selectedgroup) {
            dispatch(refreshgroup());
            fetchMessages(); 
        }
    }, []);
    
    
    const handleSendMessage = () => {
        if (selectedgroup && message.trim()) {
            setScroll(true)
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

    const socket = useSocket();
    if (!socket) {
        return <div>Loading socket connection...</div>;
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            {addMember && <SearchMemberToAdd setAddMember={setAddMember} />}
            <div className="w-full h-[10vh] text-black p-2 flex items-center justify-center">
                <div className="font-slim relative bg-white flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[100%]">
                    <img
                        onClick={handleCloseGroup}
                        src="/icons/back.png"
                        className="flex md:hidden w-8 h-8"
                    />
                    <div className="relative flex -space-x-7">
                        {selectedgroup &&
                            selectedgroup.members.slice(0, 4).map((member, index) => (
                                <img
                                    key={index}
                                    src={member.avatar}
                                    alt="Avatar"
                                    className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2 border-white"
                                    style={{ zIndex: selectedgroup.members.length + index }}
                                />
                            ))}
                    </div>
                    <p className="text-base">@{selectedgroup.groupName}</p>
                    <img
                        onClick={() => setAddMember(true)}
                        src="/icons/addblack.png"
                        className="w-6 h-6 absolute right-5"
                    />
                </div>
            </div>
            <div>
                {page != 0 ? (<div
                    className="w-full overflow-y-auto overflow-x-hidden h-[80vh] p-5"
                >
                    <div onClick={fetchMoreData} className="w-full h-10 flex items-center justify-center font-slim text-black">
                        {loading && <p className="p-2 bg-white rounded-xl w-fit">Loading</p>}
                        {!loading && <p className="p-2 bg-white rounded-xl w-fit">{page >= total && page != 0 && total != 0 ? "" : "Load More Messages"}</p>}
                    </div>
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
                                <div className="max-w-[50%] md:max-w-1/2 ">
                                    {msg.sender !== currentUser._id && sender && (
                                        <p className="text-xs md:text-sm text-white">{sender.username}</p>
                                    )}
                                    <div
                                        className={`max-w-[100%] md:max-w-1/2 p-2 rounded-lg ${
                                            msg.sender === currentUser._id
                                                ? "bg-white text-black bg-opacity-50"
                                                : "bg-white"
                                        }`}
                                    >
                                        <p className="w-auto text-sm md:text-md break-words whitespace-normal">
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
                    <div ref={endofMessage} />
                </div>):(
                    <div className="w-full text-white font-slim flex items-center justify-center bg-blue-400 h-[80vh]">
                        Loading Chats
                    </div>
                )}
            </div>
            <div className="w-full min-h-[10vh] h-auto flex items-center absolute bottom-0 p-2">
                <div className="font-slim bg-white rounded-xl bg-opacity-90 text-white flex justify-between gap-2 items-center w-full h-full">
                    <textarea
                        onChange={(e) => setMessage(e.target.value)}
                        value={message}
                        placeholder="Message"
                        className="w-[90%] text-black p-2 outline-none bg-transparent resize-none"
                        style={{ minHeight: "100%", maxHeight: "20vh", overflowY: "auto" }}
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
