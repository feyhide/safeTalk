/* eslint-disable react/prop-types */
import { useSocket } from "../context/SocketContext.jsx";
import { useSelector } from "react-redux";

const SearchedContactsList = ({ searchContacts, setSearchContacts }) => {
  const socket = useSocket();
  const { currentUser } = useSelector((state) => state.user);

  const handleSendConnection = (recipientId) => {
    socket.emit("sendConnection", {
      sender: currentUser._id,
      recipient: recipientId,
    });
    setSearchContacts((prevContacts) =>
      prevContacts.filter((c) => c._id !== recipientId)
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto ">
      {searchContacts?.map((contact, index) => (
        <div
          key={index}
          className="w-full flex justify-between items-center py-2"
        >
          <div className="w-auto flex h-full items-center gap-2">
            <img
              src={contact.avatar}
              className="w-8 h-8 rounded-full border-2"
            />
            <p>{contact.username}</p>
          </div>
          <div className="w-auto">
            <button
              onClick={() => handleSendConnection(contact._id)}
              className="p-2 bg-green-500 text-white rounded-xl"
            >
              Send Connection
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchedContactsList;
