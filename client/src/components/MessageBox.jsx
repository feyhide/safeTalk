import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { appendOlderMessages, refreshChat, reset, updatePageAndTotal } from "../redux/chatSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import InfiniteScroll from "react-infinite-scroll-component";
import { resetGroup } from "../redux/groupSlice.js";
import { DOMAIN } from "../constant/constant.js";
import { resetUser } from "../redux/userSlice.js";

const MessageBox = () => {
    window.addEventListener('beforeunload', (event) => {
        dispatch(reset())
    });
    const { selectedChat, chatData, page, total } = useSelector((state) => state.chat);
    const { currentUser } = useSelector((state) => state.user);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const endofMessage = useRef(null)
    const chatContainerRef = useRef(null);
    const [scroll,setScroll] = useState(true);

    useEffect(()=>{
        if(scroll){
            endofMessage.current?.scrollIntoView()
        }
    },[chatData])

    const fetchMessages = async () => {
        if (loading) return; 
        setLoading(true); 
        if (page >= total && page != 0 && total != 0){
            return
        }
        try {
            const res = await fetch(DOMAIN+`api/v1/chat/get-messages`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chatId: selectedChat.chatId,
                    page:page+1,
                    limit: 15,
                }),
            });
            if (res.status === 401 || res.status === 403) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if(page+1 === 1){
                dispatch(refreshChat())
            }
            const data = await res.json();
            if (res.ok) {
                dispatch(appendOlderMessages(data.messages));
                dispatch(updatePageAndTotal({page:data.pagination.page,total:data.pagination.totalPages}))
            } else {
                console.error("Failed to fetch messages:", data);
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoading(false); 
        }
    };
    

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
            
            setScroll(true)
        }
    };

    const fetchMoreData = () => {
        setScroll(false)
        fetchMessages(page+1);
    };

    useEffect(() => {
        dispatch(refreshChat())
        fetchMessages();
    }, [selectedChat]);

    const socket = useSocket();
    if (!socket) {
        return <div className="w-full h-full flex items-center justify-center font-slim">Loading...</div>;
    }

    const handleCloseChat = () => {
        dispatch(reset());
    }

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="w-full h-[10vh] text-black p-2 flex items-center justify-center">
                <div className="font-slim bg-white flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[100%]">
                    <img
                        onClick={handleCloseChat}
                        src="/icons/back.png"
                        className="flex md:hidden w-8 h-8"
                    />
                    <img
                        src={selectedChat.userId.avatar}
                        className="w-8 h-8 rounded-full bg-black bg-opacity-50 border-2"
                    />
                    <p className="text-base">@{selectedChat.userId.username}</p>
                </div>
            </div>
            <div>
                {page != 0 ? (<div
                    id="scrollable-chat-container"
                    className="w-full overflow-y-auto overflow-x-hidden h-[80vh] p-5"
                    ref={chatContainerRef}
                >
                    <div onClick={fetchMoreData} className="w-full h-10 flex items-center justify-center font-slim text-black">
                        {loading && <p className="p-2 bg-white rounded-xl w-fit">Loading</p>}
                        {!loading && <p className="p-2 bg-white rounded-xl w-fit">{page >= total && page != 0 && total != 0 ? "" : "Load More Messages"}</p>}
                    </div>
                    {chatData.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-2 w-full h-auto ${
                                msg.sender === currentUser._id ? "justify-end" : "justify-start"
                            } mb-4`}
                        >
                            {msg.sender != currentUser._id && <img src={selectedChat.userId.avatar} className="h-8 rounded-full bg-black bg-opacity-50 border-2 "/>}
                            <div
                                className={`max-w-[50%] md:max-w-1/2 p-2 rounded-lg ${
                                    msg.sender === currentUser._id
                                        ? "bg-white text-black bg-opacity-50"
                                        : "bg-white"
                                }`}
                            >
                                <p className="w-auto break-words font-slim whitespace-normal">{msg.message}</p>
                            </div>
                            {msg.sender === currentUser._id && <img src={currentUser.avatar} className="h-8 rounded-full bg-black bg-opacity-50 border-2 "/>}
                        </div>
                    ))}
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
