/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  appendOlderMessages,
  refreshChat,
  resetChat,
} from "../redux/chatSlice.js";
import { useSocket } from "../context/SocketContext.jsx";
import { DOMAIN } from "../constant/constant.js";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useIntersection } from "@mantine/hooks";
import axios from "axios";
import ChatInfo from "./ChatInfo.jsx";
import { formatDayTime, formatTime } from "../utils/utils.js";
import Upload from "./Upload.jsx";
import toast, { Toaster } from "react-hot-toast";
import MessageComponent from "./MessageComponent.jsx";
import MediaPreview from "./MediaPreview.jsx";

const MessageBox = () => {
  const socket = useSocket();
  const [chatInfo, setChatInfo] = useState(false);
  const { selectedChat, chatData } = useSelector((state) => state.chat);
  const { currentUser } = useSelector((state) => state.user);
  const [otherMember, setOtherMember] = useState(null);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const chatContainerRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const [upload, setUpload] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [audioMode, setAudioMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [audioTime, setAudioTime] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedChat._id) {
      queryClient.removeQueries(["chat"]);
    }
  }, [selectedChat._id]);

  useEffect(() => {
    if (!selectedChat || !selectedChat.members) return;

    let other = selectedChat.members.find(
      (member) => member._id !== currentUser?._id
    );

    setOtherMember(other);
  }, [selectedChat, currentUser]);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: ["chat", selectedChat._id],
      queryFn: async ({ pageParam = 1 }) => {
        const { data } = await axios.get(
          `${DOMAIN}api/v1/chat/get-messages?chat=${selectedChat._id}&page=${pageParam}`,
          { withCredentials: true }
        );

        if (data.success) {
          dispatch(
            appendOlderMessages({
              messages: data.data,
              page: pageParam,
            })
          );
          return data.success ? data : { data: [], totalPages: 1 };
        } else {
          console.log(data.message);
        }
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const nextPage = allPages.length + 1;
        return nextPage <= lastPage.totalPages ? nextPage : undefined;
      },
      enabled: !!selectedChat._id && selectedChat.members.length > 1,
    });

  const { ref, entry } = useIntersection({ root: null, threshold: 1 });

  useEffect(() => {
    if (selectedChat && entry?.isIntersecting && hasNextPage) {
      fetchNextPage();
    }
  }, [selectedChat, entry, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (!chatContainerRef.current || !data) return;

    const chatBox = chatContainerRef.current;

    setTimeout(() => {
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);

    prevScrollHeightRef.current = chatBox.scrollHeight;
  }, [chatData?.[0]?.messages?.length]);

  useEffect(() => {
    if (!chatContainerRef.current || !data) return;

    const chatBox = chatContainerRef.current;

    if (data.pages.length === 1) {
      chatBox.scrollTop = chatBox.scrollHeight;
    } else {
      chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeightRef.current;
    }

    prevScrollHeightRef.current = chatBox.scrollHeight;
  }, [chatData?.length]);

  const handleSendMessage = () => {
    if (selectedChat && message.trim() && otherMember) {
      socket.emit("sendMessage", {
        sender: currentUser._id,
        recipient: otherMember?._id,
        chatId: selectedChat._id,
        message: message.trim(),
      });
      setMessage("");
    }
  };

  const handleSendFileUrlSocket = (payload) => {
    if (selectedChat && payload.trim() && otherMember) {
      socket.emit("sendMessage", {
        sender: currentUser._id,
        recipient: otherMember?._id,
        chatId: selectedChat._id,
        message: payload,
      });
    }
  };

  const handleSendConnection = () => {
    if (selectedChat.pastMembers.length > 0) {
      socket.emit("sendConnection", {
        sender: currentUser._id,
        recipient: selectedChat.pastMembers?.[0]?._id,
      });
    }
  };

  const handleUpload = async (files) => {
    setUpload(false);
    const toastId = toast.loading("Sending Files...");
    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });
      console.log(formData);
      const { data } = await axios.post(
        DOMAIN + "api/v1/upload/upload-files",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      toast.dismiss(toastId);
      if (data.success) {
        console.log("Added Image successfully!", data.data);
        if (data.data.length > 0) {
          data.data.forEach((item) => {
            handleSendFileUrlSocket(item);
          });
        }
      } else {
        console.log(data.message);
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error(error);
    }
  };

  useEffect(() => {
    dispatch(refreshChat());
  }, [selectedChat]);

  const handleCloseChat = () => {
    dispatch(resetChat());
  };

  const handlePreview = (msg) => {
    const cloudinaryUrlPattern =
      /https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9]+\/.*/;

    const isCloudinaryUrl = cloudinaryUrlPattern.test(msg);
    if (isCloudinaryUrl) {
      setSelectedMedia(msg);
    }
  };

  const handleUploadAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], "audio.wav", {
        type: "audio/wav",
      });
      formData.append("audio", audioFile);

      const { data } = await axios.post(
        DOMAIN + "api/v1/upload/upload-audio",
        formData,
        {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (data.success) {
        console.log("audio successfully!", data.data);
        handleSendFileUrlSocket(data.data);
        console.log(data.data);
      } else {
        console.log(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAudioTime(0);

      const updateAudioTime = setInterval(() => {
        if (mediaRecorderRef.current.state === "recording") {
          setAudioTime((prevTime) => prevTime + 1);
        }
      }, 1000);

      mediaRecorderRef.current.onstop = () => {
        clearInterval(updateAudioTime);
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        handleUploadAudio(audioBlob);

        streamRef.current.getTracks().forEach((track) => track.stop());
      };
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioMode = () => {
    if (audioMode) {
      setAudioMode(false);
      if (isRecording) {
        stopRecording();
      }
    } else {
      setAudioMode(true);
      setAudioTime(0);
      if (!isRecording) {
        startRecording();
      }
    }
  };

  useEffect(() => {
    let timeout;
    if (isRecording) {
      timeout = setTimeout(() => {
        handleAudioMode();
      }, 300000);
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isRecording]);

  return (
    <>
      <Toaster />
      {chatInfo ? (
        <ChatInfo
          hideFunc={setChatInfo}
          selectedChat={selectedChat}
          currentUser={currentUser}
        />
      ) : (
        <div className="w-full h-full flex flex-col relative">
          {upload && (
            <Upload
              fileUpload={handleUpload}
              upload={upload}
              setUpload={setUpload}
            />
          )}
          {selectedMedia && (
            <MediaPreview
              setSelectedMedia={setSelectedMedia}
              msg={selectedMedia}
            />
          )}
          <div className="w-full h-auto text-black px-2 pt-2 flex items-center justify-center">
            <div className="font-slim bg-white/20 flex gap-2 p-2 rounded-xl bg-opacity-90 items-center w-[100%] h-[8vh]">
              <img
                onClick={handleCloseChat}
                src="/icons/back.png"
                className="flex lg:hidden w-8 h-8"
              />
              <div
                onClick={() => setChatInfo(true)}
                className="flex items-center justify-center text-white"
              >
                <img
                  src={
                    otherMember?.avatar || selectedChat.pastMembers?.[0]?.avatar
                  }
                  className="w-8 h-8 rounded-full z-10 bg-black bg-opacity-50 border-2"
                />
                <p className="bg-blue-400 rounded-r-xl shadow-md -ml-1 px-2">
                  {otherMember?.username ||
                    selectedChat.pastMembers?.[0]?.username}
                </p>
              </div>
            </div>
          </div>
          <div className="p-1 w-full h-full font-slim">
            <div
              ref={chatContainerRef}
              className="w-full overflow-y-auto overflow-x-hidden customScroll px-2 h-[77svh]"
            >
              {selectedChat.members.length > 1 ? (
                <>
                  {isFetchingNextPage && (
                    <div className="text-center text-white text-sm mb-2">
                      Fetching more...
                    </div>
                  )}
                  {chatData
                    .flatMap((group) => group.messages)
                    .reverse()
                    .map((msg, index) => {
                      const isFirstItem = index === 0;
                      return (
                        <div
                          key={msg._id}
                          ref={isFirstItem ? ref : null}
                          className={`flex items-center gap-2 w-full h-auto ${
                            msg.sender === currentUser._id
                              ? "justify-end"
                              : "justify-start"
                          } mb-4`}
                        >
                          {msg.sender !== currentUser._id && (
                            <img
                              src={otherMember?.avatar}
                              className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                            />
                          )}
                          <div
                            onClick={() => handlePreview(msg.message)}
                            className={`max-w-[50%] lg:max-w-1/2 p-2 rounded-lg ${
                              msg.sender === currentUser._id
                                ? "bg-white text-black bg-opacity-50"
                                : "bg-white"
                            }`}
                          >
                            <MessageComponent msg={msg.message} />
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
                          {msg.sender === currentUser._id && (
                            <img
                              src={currentUser.avatar}
                              className="h-8 rounded-full bg-black bg-opacity-50 border-2"
                            />
                          )}
                        </div>
                      );
                    })}
                </>
              ) : (
                <div className="w-full text-white text-center text-sm h-full items-center justify-center flex flex-col">
                  <p>
                    {selectedChat.pastMembers?.[0]?.username} has unfriended
                    you. To continue the conversation, click the button below.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="w-full min-h-[10svh] h-auto flex items-center justify-center absolute bottom-0 p-2">
            {selectedChat?.members?.length > 1 ? (
              <div className="font-slim rounded-xl text-white flex justify-between gap-2 items-center w-full h-full">
                <div className="w-[10%] bg-white py-2 rounded-xl flex items-center justify-center">
                  <img
                    onClick={() => setUpload(!upload)}
                    src="/icons/addblack.png"
                    className="w-8 h-8"
                  />
                </div>
                {audioMode ? (
                  <p className="w-[75%] flex items-center justify-center">
                    {formatTime(audioTime)}
                  </p>
                ) : (
                  <textarea
                    onChange={(e) => setMessage(e.target.value)}
                    value={message}
                    placeholder="Message"
                    className="w-[75%] bg-white rounded-xl text-black p-2 outline-none bg-transparent resize-none"
                    style={{
                      minHeight: "100%",
                      maxHeight: "20svh",
                      overflowY: "auto",
                    }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(
                        e.target.scrollHeight,
                        e.target.offsetHeight + 150
                      )}px`;
                    }}
                  />
                )}
                <div className="w-[15%] rounded-xl flex gap-2 items-center justify-center">
                  <img
                    onClick={handleAudioMode}
                    src="/icons/mic.png"
                    className={`w-1/2 h-full rounded-full ${
                      audioMode ? "bg-red-500" : "bg-white"
                    } p-2`}
                  />
                  <img
                    onClick={handleSendMessage}
                    src="/icons/send.png"
                    className={`w-1/2 h-full rounded-full ${
                      audioMode ? "bg-white/50" : "bg-white"
                    } p-2`}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleSendConnection}
                className="bg-green-600 text-white p-2 rounded-xl"
              >
                ReAdd
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MessageBox;
