/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { formatDate } from "../utils/utils";
import { useSocket } from "../context/SocketContext";

const GroupInfo = ({ selectedGroup, currentUser, hideFunc }) => {
  const socket = useSocket();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let member = selectedGroup?.members.find(
      (member) => member.user._id === currentUser._id
    );

    if (member?.role === "admin") {
      setIsAdmin(true);
    }
  }, [selectedGroup]);

  const handleRemoveMember = (userId) => {
    if (!isAdmin) return;

    let memberIds = selectedGroup.members.map((member) => member.user._id);
    socket.emit("removeMember", {
      sender: currentUser._id,
      members: memberIds,
      groupId: selectedGroup._id,
      userTodel: userId,
    });

    setSelectedUser(null);
  };

  const handleChangeRole = (userId) => {
    if (!isAdmin) return;

    let memberIds = selectedGroup.members.map((member) => member.user._id);
    socket.emit("changeRole", {
      sender: currentUser._id,
      members: memberIds,
      groupId: selectedGroup._id,
      userToChangeRole: userId,
    });

    setSelectedUser(null);
  };

  const handleLeaveGroup = () => {
    let memberIds = selectedGroup.members.map((member) => member.user._id);
    socket.emit("leaveGroup", {
      sender: currentUser._id,
      members: memberIds,
      groupId: selectedGroup._id,
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
        <div className=" w-full h-[80%] text-md flex flex-col items-center justify-center">
          <div className=" gap-2 flex flex-col items-center justify-center w-full h-[15%]">
            <div className="relative flex -space-x-8">
              {selectedGroup &&
                selectedGroup?.members
                  .slice(0, 4)
                  .map((member, index) => (
                    <img
                      key={index}
                      src={member.user.avatar}
                      alt="Avatar"
                      className="w-10 h-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                      style={{ zIndex: selectedGroup.members.length + index }}
                    />
                  ))}
            </div>
            <p>{selectedGroup?.groupName}</p>
          </div>
          <div className="w-full h-[60%] relative p-2 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center w-full p-2 h-[100%] relative rounded-xl bg-white/20 shadow-md">
              {selectedUser ? (
                <div className="w-full relative h-full flex flex-col items-center justify-center">
                  <img
                    onClick={() => setSelectedUser(null)}
                    src="/icons/cross.png"
                    className="w-8 h-8 absolute left-2 top-2"
                  />
                  <div className="w-full flex flex-col items-center justify-center">
                    <img
                      src={selectedUser.user.avatar}
                      alt="Avatar"
                      className="w-10 h-10 z-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                    />
                    <p>{selectedUser.user.username}</p>
                  </div>
                  <div className="w-full flex text-sm gap-2 items-center justify-center">
                    <p
                      onClick={() => handleChangeRole(selectedUser.user._id)}
                      className="p-2 bg-green-500 rounded-xl"
                    >
                      {selectedUser.role === "member" ? "Promote" : "Demote"}
                    </p>
                    <p
                      onClick={() => handleRemoveMember(selectedUser.user._id)}
                      className="p-2 bg-red-500 rounded-xl"
                    >
                      Remove
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full h-[10%] flex items-center justify-between">
                    <p className="">Members</p>
                  </div>
                  <div className="w-full h-[90%] overflow-y-auto customScroll flex flex-col gap-2">
                    {selectedGroup &&
                      selectedGroup.members.map((member, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            if (
                              member.user._id !== currentUser._id &&
                              isAdmin
                            ) {
                              setSelectedUser(member);
                            }
                          }}
                          className="w-full flex items-center gap-1"
                        >
                          <img
                            src={member.user.avatar}
                            alt="Avatar"
                            className="w-10 h-10 z-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                          />
                          <div className="flex w-full items-center justify-between bg-blue-400 shadow-md rounded-r-xl -ml-2 px-2">
                            <p>{member.user.username}</p>
                            <p className="text-xs">{member.role}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="w-full h-[10%] flex items-center justify-center">
            <p onClick={handleLeaveGroup} className="bg-red-500 p-2 rounded-xl">
              Leave Group
            </p>
          </div>
        </div>
        <div className="w-full h-[10%] text-sm flex flex-col items-center justity-center">
          <p>Together Since</p>
          <p>{formatDate(selectedGroup.createdAt)}</p>
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;
