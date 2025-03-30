/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import { DOMAIN } from "../constant/constant";
import { useEffect, useState } from "react";
import { formatDate } from "../utils/utils";

const GroupInfo = ({ groupId, currentUser, hideFunc }) => {
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchgroupInfo = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${DOMAIN}api/v1/group/get-group-info?groupId=${groupId}`,
        { withCredentials: true }
      );

      if (data.success) {
        console.log(data.data);
        setGroupInfo(data.data);
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
    if (groupId) fetchgroupInfo();
  }, [groupId]);

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
          <div className=" w-full h-[80%] text-md flex flex-col items-center justify-center">
            <div className=" gap-2 flex flex-col items-center justify-center w-full h-[15%]">
              <div className="relative flex -space-x-8">
                {groupInfo &&
                  groupInfo.members
                    .slice(0, 4)
                    .map((member, index) => (
                      <img
                        key={index}
                        src={member.user.avatar}
                        alt="Avatar"
                        className="w-10 h-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                        style={{ zIndex: groupInfo.members.length + index }}
                      />
                    ))}
              </div>
              <p>{groupInfo.groupName}</p>
            </div>
            <div className="w-full h-[60%] relative p-2 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center w-full p-2 h-[100%] relative rounded-xl bg-white/20 shadow-md">
                <p>Members</p>
                <div className="w-full h-[90%] overflow-y-auto customScroll flex flex-col gap-2">
                  {groupInfo &&
                    groupInfo.members.map((member, index) => (
                      <div key={index} className="w-full flex items-center">
                        <img
                          key={index}
                          src={member.user.avatar}
                          alt="Avatar"
                          className="w-10 h-10 z-10 bg-black bg-opacity-50 rounded-full border-2 border-white"
                        />
                        <div className="flex w-full items-center justify-between bg-blue-400 shadow-md rounded-r-xl -ml-1 px-2">
                          <p>{member.user.username}</p>
                          <p className="text-xs">{member.role}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="w-full h-[10%] flex items-center justify-center">
              <p className="bg-red-500 p-2 rounded-xl">Leave Group</p>
            </div>
          </div>
          <div className="w-full h-[10%] text-sm flex flex-col items-center justity-center">
            <p>Together Since</p>
            <p>{formatDate(groupInfo.createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfo;
