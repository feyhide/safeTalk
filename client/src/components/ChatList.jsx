/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import SearchedContactsList from "./SearchedContactsList";
import { addChatuser, reset } from "../redux/chatSlice";
import { appendGroup, resetUser } from "../redux/userSlice";
import { addGroup, resetGroup } from "../redux/groupSlice";
import { useSocket } from "../context/SocketContext";
import { DOMAIN } from "../constant/constant.js";

const Listing = ({ createFunc, changingFunc, mappingData, type }) => {
  return (
    <div className={`px-1 w-full max-h-[45%] py-2 flex flex-col gap-1`}>
      <div className="flex w-full min-h-[10%] justify-between items-center">
        <h1 className="font-heading capitalize font-semibold text-lg text-white">
          {type}
        </h1>
        <img onClick={createFunc} src="/icons/add.png" className="w-6 h-6" />
      </div>
      <div className="max-h-[90%] customScroll overflow-y-auto overflow-x-hidden text-white font-slim w-full">
        {mappingData.map((data, index) => (
          <div
            key={index}
            className="w-full flex justify-between items-center py-2"
          >
            <div
              onClick={() => changingFunc(data)}
              className="w-auto flex h-full items-center gap-2"
            >
              {type === "groups" ? (
                <div className="relative flex -space-x-7">
                  {data.members.slice(0, 4).map((member, index) => (
                    <img
                      key={index}
                      src={member.avatar}
                      alt="Avatar"
                      className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2 border-white"
                      style={{ zIndex: data.members.length + index }}
                    />
                  ))}
                </div>
              ) : (
                <img
                  src={data.userId.avatar}
                  className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2"
                />
              )}
              <p>
                {type === "friends" ? data.userId.username : data.groupName}
              </p>
            </div>
            {/* <img
                      onClick={() => {
                        setRemoveConnect(people);
                      }}
                      className="w-5 h-5"
                      src="/icons/delete.png"
                    /> */}
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatList = ({ setLogOut }) => {
  const socket = useSocket();
  const { currentUser } = useSelector((state) => state.user);
  const { selectedgroup } = useSelector((state) => state.group);
  const { selectedChat } = useSelector((state) => state.chat);
  const [sendConnect, setSendConnect] = useState(false);
  const [createGroup, setCreateGroup] = useState(false);
  const [searchContacts, setSearchContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [groupName, setGroupName] = useState("");
  const dispatch = useDispatch();
  const [removeConnect, setRemoveConnect] = useState(null);

  const handleSearch = async () => {
    const usernameRegex = /^[a-z][a-z0-9_]*$/;
    searchName.toLocaleLowerCase();

    if (!usernameRegex.test(searchName)) {
      return toast.error(
        "Username must start with a letter and contain only lowercase letters, numbers, or underscores."
      );
    }

    setLoading(true);
    try {
      const res = await fetch(DOMAIN + `api/v1/user/search-users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: searchName }),
      });

      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        console.warn("Session expired. Redirecting to login...");
        dispatch(reset());
        dispatch(resetGroup());
        dispatch(resetUser());
        window.location.href = "/";
        return;
      }
      if (data.success) {
        setSearchContacts(data.data);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log("searching user error :", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchName.length >= 3) {
      const usernameDebounce = setTimeout(() => {
        handleSearch();
      }, 500);

      return () => clearTimeout(usernameDebounce);
    } else {
      setSearchContacts([]);
    }
  }, [searchName]);

  const handleChangeChatUser = (people) => {
    if (selectedChat && selectedChat.userId._id === people.userId._id) {
      return;
    }
    dispatch(reset());
    dispatch(resetGroup());
    dispatch(addChatuser(people));
  };
  const handleChangeGroup = (group) => {
    if (selectedgroup && selectedgroup._id === group._id) {
      return;
    }
    dispatch(reset());
    dispatch(resetGroup());
    dispatch(addGroup(group));
  };

  const handleCreateGroup = async () => {
    const groupNameRegex = /^[a-zA-Z0-9_]*$/;

    if (!groupNameRegex.test(groupName)) {
      return toast.error(
        "groupName must start with a letter and contain only letters, numbers, or underscores."
      );
    }

    setLoading(true);
    try {
      const res = await fetch(DOMAIN + `api/v1/group/create-group`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ groupName: groupName }),
      });

      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        console.warn("Session expired. Redirecting to login...");
        dispatch(reset());
        dispatch(resetGroup());
        dispatch(resetUser());
        window.location.href = "/";
        return;
      }

      if (data.success) {
        dispatch(appendGroup(data.data));
        setCreateGroup(false);
        setGroupName("");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log("creating group error :", error);
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveConnectionData = () => {
    const other = removeConnect;
    socket.emit("removeConnection", {
      sender: currentUser._id,
      recipient: other.userId._id,
    });
    setRemoveConnect(null);
  };
  return (
    <>
      <Toaster />
      <div className="w-screen flex flex-col relative lg:w-[30%] items-center justify-center h-screen bg-white">
        {removeConnect && (
          <div className="z-50 absolute w-[90vw] flex items-center justify-center flex-col lg:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30">
            <div className="w-[90%] h-[80%] rounded-xl relative bg-white">
              <div className="w-full h-full flex p-2 flex-col font-slim justify-center items-center gap-2">
                <h1 className="font-heading font-bold text-black text-lg text-center">
                  Sure you want to remove connection with{" "}
                  {removeConnect?.userId.username} ?
                </h1>
                <p className="font-slim text-xs text-black text-center">
                  This will delete all messages on both side
                </p>
                <div className="w-full font-slim h-auto items-center justify-center flex gap-2">
                  <button
                    onClick={() => setRemoveConnect(null)}
                    className="bg-red-400  text-white py-1 px-5 rounded-xl"
                  >
                    No
                  </button>
                  <button
                    onClick={handleRemoveConnectionData}
                    className="bg-blue-400 text-white py-1 px-5 rounded-xl"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {sendConnect && (
          <div className="z-50 absolute w-[90vw] text-white flex items-center justify-center flex-col lg:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30">
            <div className="w-[90%] h-[80%] rounded-xl relative bg-blue-400">
              <img
                onClick={() => setSendConnect(false)}
                className="w-8 h-8 absolute top-5 left-5"
                src="/icons/crossblack.png"
              />
              <div className="w-full h-full flex p-2 flex-col font-slim justify-center items-center">
                <div className="w-full h-[15%] flex flex-col items-center gap-2">
                  <h1 className="font-semibold text-center text-xl">
                    Add Friends
                  </h1>
                  <div className="w-full bg-slate-500/50 rounded-xl px-2 flex items-center">
                    <input
                      type="text"
                      placeholder="username"
                      onChange={(e) => setSearchName(e.target.value)}
                      value={searchName}
                      className="w-full lowercase p-2 bg-transparent outline-none"
                    />
                  </div>
                </div>
                <div className="w-full h-[70%] flex flex-col justify-center items-center">
                  {loading ? (
                    <div className="flex flex-col justify-center items-center w-full h-full">
                      Searching
                    </div>
                  ) : searchContacts.length > 0 ? (
                    <SearchedContactsList
                      searchContacts={searchContacts}
                      setSearchContacts={setSearchContacts}
                    />
                  ) : (
                    <div className="flex flex-col justify-center items-center w-full h-full">
                      {searchName.length === 0
                        ? "Search for a user"
                        : "No Contacts matched"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {createGroup && (
          <div className="z-50 absolute w-[90vw] flex items-center justify-center flex-col lg:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30">
            <div className="w-[90%] text-white p-2 h-[50%] rounded-xl overflow-hidden relative bg-blue-400">
              <img
                onClick={() => setCreateGroup(false)}
                className="w-8 h-8 absolute top-5 left-5"
                src="/icons/crossblack.png"
              />
              <div className="w-full h-full font-slim flex flex-col gap-2 justify-center items-center">
                <div className="w-full bg-slate-500/50 rounded-xl px-2 flex flex-col items-center">
                  <input
                    type="text"
                    placeholder="Group Name"
                    onChange={(e) => setGroupName(e.target.value)}
                    value={groupName}
                    className="w-full p-2 bg-transparent rounded-xl outline-none"
                  />
                </div>
                <button
                  onClick={handleCreateGroup}
                  className="bg-green-500 p-2 text-white rounded-xl"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="w-[90vw] flex flex-col lg:w-[90%] h-[95%] rounded-xl bg-blue-400 bg-opacity-90">
          <div className="w-full h-[10%] p-2 gap-2 flex flex-col items-center justify-center">
            <h1 className="font-heading font-bold text-3xl text-white">
              SafeTalk
            </h1>
            <div className="font-slim text-white flex justify-between w-full items-center">
              <div className="flex gap-2 items-center w-auto">
                <img
                  src={currentUser?.avatar}
                  className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2"
                />
                <p className="text-base">{currentUser?.username}</p>
              </div>
              <img
                onClick={() => setLogOut(true)}
                src="/icons/logout.png"
                className="w-5 h-5"
              />
            </div>
          </div>
          <Listing
            mappingData={currentUser.connectedPeoples}
            createFunc={() => setSendConnect(true)}
            changingFunc={handleChangeChatUser}
            type={"friends"}
          />
          <Listing
            mappingData={currentUser.connectedGroups}
            createFunc={() => setCreateGroup(true)}
            changingFunc={handleChangeGroup}
            type={"groups"}
          />
        </div>
      </div>
    </>
  );
};

export default ChatList;
