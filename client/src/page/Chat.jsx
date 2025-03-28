import { useState } from "react";
import ChatList from "../components/ChatList";
import ChatBox from "../components/ChatBox";
import toast, { Toaster } from "react-hot-toast";
import { resetUser } from "../redux/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { resetChat } from "../redux/chatSlice.js";
import { resetGroup } from "../redux/groupSlice.js";
import { DOMAIN } from "../constant/constant.js";

const Chat = () => {
  const [loading, setLoading] = useState(false);
  const [logOut, setLogOut] = useState(false);
  const dispatch = useDispatch();
  const { selectedgroup } = useSelector((state) => state.group);
  const { selectedChat } = useSelector((state) => state.chat);
  const handleLogOut = async () => {
    setLoading(true);
    try {
      const res = await fetch(DOMAIN + `api/v1/auth/sign-out`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        console.warn("Session expired. Redirecting to login...");
        dispatch(resetChat());
        dispatch(resetGroup());
        dispatch(resetUser());
        window.location.href = "/";
        return;
      }
      if (data.success) {
        dispatch(resetChat());
        dispatch(resetGroup());
        dispatch(resetUser());
        window.location.href = "/";
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Toaster />
      {logOut ? (
        <>
          <div className="w-screen h-screen flex gap-4 items-center justify-center flex-col bg-gradient-to-b from-white via-blue-300 to-blue-500">
            {loading ? (
              <h1 className="font-heading font-bold text-white text-3xl lg:text-5xl text-center">
                Signing you out. Goodbye!
              </h1>
            ) : (
              <>
                <h1 className="font-heading font-bold text-white text-3xl lg:text-5xl text-center">
                  Sure you want to say goodbye to SafeTalk ?
                </h1>
                <div className="w-full font-slim h-auto items-center justify-center flex gap-2">
                  <button
                    onClick={() => setLogOut(false)}
                    className="bg-red-400 lg:text-xl text-white py-1 px-5 rounded-xl"
                  >
                    No
                  </button>
                  <button
                    onClick={handleLogOut}
                    className="bg-blue-400 lg:text-xl text-white py-1 px-5 rounded-xl"
                  >
                    Yes
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="hidden lg:flex justify-between w-screen h-screen">
            <ChatList setLogOut={setLogOut} />
            <ChatBox />
          </div>
          <div className="lg:hidden w-screen h-screen flex">
            {selectedChat || selectedgroup ? (
              <ChatBox />
            ) : (
              <ChatList setLogOut={setLogOut} />
            )}
          </div>
        </>
      )}
    </>
  );
};

export default Chat;
