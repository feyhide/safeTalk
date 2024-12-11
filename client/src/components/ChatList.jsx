import axios from 'axios';
import React, { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import SearchedContactsList from './SearchedContactsList';
import { addChatuser, reset } from '../redux/chatSlice';
import { appendGroup, resetUser } from '../redux/userSlice';
import { addGroup, resetGroup } from '../redux/groupSlice';
import { useSocket } from '../context/SocketContext';
import { DOMAIN } from '../constant/constant.js';

const ChatList = ({setLogOut}) => {
    const {currentUser} = useSelector(state => state.user);
    const [sendConnect,setSendConnect] = useState(false);
    const [createGroup,setCreateGroup] = useState(false);
    const [searchContacts,setSearchContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [groupName, setGroupName] = useState('');
    const dispatch = useDispatch()
    const [removeConnect,setRemoveConnect] = useState(null)
    const handleSearch = async() => {
        const usernameRegex = /^[a-z][a-z0-9_]*$/
        searchName.toLocaleLowerCase();

        if(!usernameRegex.test(searchName)){
            return toast.error("Username must start with a letter and contain only lowercase letters, numbers, or underscores.")
        }

        setLoading(true);
        try {
            const res = await fetch(DOMAIN+`api/v1/user/search-users`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: searchName }), 
            });

            const data = await res.json();

            if (res.status === 401 || res.status === 403) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if(data.success){
                setSearchContacts(data.data);
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log("searching user error :",error)
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setLoading(false); 
        }
    }
    
    useEffect(() => {
        if (searchName.length >= 3) {
            const usernameDebounce = setTimeout(() => {
                handleSearch();
            }, 500); 

            return () => clearTimeout(usernameDebounce);
        }
    }, [searchName]);

    const handleChangeChatUser = (people) => {
        dispatch(reset());
        dispatch(resetGroup());
        dispatch(addChatuser(people))
    }
    const handleChangeGroup = (group) => {
        dispatch(reset());
        dispatch(resetGroup());
        dispatch(addGroup(group))
    }
    
    
    const handleCreateGroup = async() => {
        const groupNameRegex = /^[a-zA-Z0-9_]*$/

        if(!groupNameRegex.test(groupName)){
            return toast.error("groupName must start with a letter and contain only letters, numbers, or underscores.")
        }

        setLoading(true);
        try {
            setGroupName("")
            const res = await fetch(DOMAIN+`api/v1/group/create-group`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ groupName: groupName }), 
            });

            const data = await res.json();
            if (res.status === 401 || res.status === 403) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if(data.success){
                dispatch(appendGroup(data.data));
                setCreateGroup(false)
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log("creating group error :",error)
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setLoading(false); 
        }
    }

    const socket = useSocket();
    if (!socket) {
        return <div className="w-full h-full flex items-center justify-center font-slim">Loading...</div>;
    }

    const handleRemoveConnectionData = () => {
        other = removeConnect;
        socket.emit("removeConnection", {
            sender: currentUser._id,
            recipient: other.userId._id
        });
        setRemoveConnect(null);
    }
    return (
    <>
    <Toaster/>
    <div className='w-screen flex flex-col relative md:w-[30%] items-center justify-center h-screen bg-white'>
        {removeConnect && (
            <div className='z-50 absolute w-[90vw] flex items-center justify-center flex-col md:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30'>
                <div className='w-[90%] h-[80%] rounded-xl relative bg-white'>
                    <div className='w-full h-full flex p-2 flex-col font-slim justify-center items-center'>
                    <h1 className='font-heading font-bold text-white text-3xl md:text-5xl text-center'>Sure you want to say goodbye to SafeTalk ?</h1>
                    <div className='w-full font-slim h-auto items-center justify-center flex gap-2'>
                        <button onClick={()=>setRemoveConnect(null)} className='bg-red-400 md:text-xl text-white py-1 px-5 rounded-xl'>No</button>
                        <button onClick={handleRemoveConnectionData} className='bg-blue-400 md:text-xl text-white py-1 px-5 rounded-xl'>Yes</button>
                    </div>
                    </div>
                </div>
            </div>
        )}
        {sendConnect && (
            <div className='z-50 absolute w-[90vw] flex items-center justify-center flex-col md:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30'>
                <div className='w-[90%] h-[80%] rounded-xl relative bg-white'>
                    <img onClick={()=>setSendConnect(false)} className='w-8 h-8 absolute top-5 left-5' src="/icons/crossblack.png"/>
                    <div className='w-full h-full flex p-2 flex-col font-slim justify-center items-center'>
                        <div className='w-full h-[20%] flex flex-col items-center justify-between'>
                            <h1 className='font-semibold text-xl'>Connect with some new mates</h1>
                            <div className='w-full bg-blue-200 rounded-xl px-2 flex items-center'>
                                @<input type='text' placeholder='username' onChange={(e)=>setSearchName(e.target.value)} value={searchName} className='w-full lowercase p-2 bg-transparent outline-none' />
                            </div>
                        </div>
                        <div className='w-full h-[50%] flex flex-col justify-center items-center'>
                            {searchContacts.length > 0 ? (<SearchedContactsList searchContacts={searchContacts} setSearchContacts={setSearchContacts}/>):(
                                <div className='flex flex-col justify-center items-center w-full h-full'>{searchName && searchName.length === 0 ? "Search for a user" : "No Contacts matched"}</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        {createGroup && (
            <div className='z-50 absolute w-[90vw] flex items-center justify-center flex-col md:w-[90%] h-[95%] rounded-xl bg-white bg-opacity-30'>
                <div className='w-[90%] h-[80%] rounded-xl overflow-hidden relative bg-white'>
                    <img onClick={()=>setCreateGroup(false)} className='w-8 h-8 absolute top-5 left-5' src="/icons/crossblack.png"/>
                    <div className='w-full h-full font-slim flex justify-center items-center'>
                        <div className='w-full p-2 flex items-center flex-col gap-2'>
                            <input type='text' placeholder='Group Name' onChange={(e)=>setGroupName(e.target.value)} value={groupName} className='w-full p-2 bg-slate-200 rounded-xl outline-none' />
                            <button onClick={handleCreateGroup} className='bg-blue-400 p-2 text-white rounded-xl'>Create Group</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        <div className='w-[90vw] flex flex-col md:w-[90%] h-[95%] rounded-xl bg-blue-400 bg-opacity-90'>
            <div className='w-full h-auto p-2 flex flex-col items-center justify-center'>
                <h1 className='font-heading font-bold text-3xl text-white'>SafeTalk</h1>
                <div className='font-slim text-white flex justify-between w-full items-center'>
                    <div className='flex gap-2 items-center w-auto'>
                        <img src={currentUser?.avatar} className='w-8 h-8 bg-black bg-opacity-50 rounded-full border-2'/>
                        <p className='text-base'>@{currentUser?.username}</p>
                    </div>
                    <img onClick={()=>setLogOut(true)} src='/icons/logout.png' className='w-5 h-5'/>
                </div>
            </div>
            <div className='p-5 w-full max-h-[45vh] flex flex-col gap-1'>
                <div className='flex w-full h-[10%] justify-between items-center'>
                    <h1 className='font-heading font-semibold text-lg text-white'>Connected Peoples</h1>
                    <img onClick={()=>setSendConnect(true)} src='/icons/add.png' className='w-6 h-6'/>
                </div>
                <div className='max-h-[90%] overflow-y-auto text-white font-slim w-full'>
                {currentUser && currentUser.connectedPeoples.map((people, index) => (
                    <div key={index} className='w-full flex justify-between items-center py-2'>
                        <div onClick={()=>{handleChangeChatUser(people)}} className='w-auto flex h-full items-center gap-2'>
                            <img src={people.userId.avatar} className='w-8 h-8 bg-black bg-opacity-50 rounded-full border-2'/>
                            <p>@{people.userId.username}</p>
                        </div>
                        <img onClick={()=>setRemoveConnect(people)} className='w-5 h-5' src='/icons/delete.png'/>
                    </div> 
                ))}
                </div>
            </div>
            <div className='p-5 w-full max-h-[45vh] flex flex-col gap-1'>
                <div className='flex w-full h-[10%] justify-between items-center'>
                    <h1 className='font-heading font-semibold text-lg text-white'>Connected Groups</h1>
                    <img onClick={()=>setCreateGroup(true)} src='/icons/add.png' className='w-6 h-6'/>
                </div>
                <div className='max-h-[90%] overflow-y-auto text-white font-slim w-full'>
                {currentUser && currentUser.connectedGroups.map((group, index) => (
                    <div key={index} className='w-full flex justify-between items-center py-2'>
                        <div onClick={()=>{handleChangeGroup(group)}} className='w-auto flex h-full items-center gap-2'>
                        <div className="relative flex -space-x-7">
                        {group &&
                            group.members.slice(0, 4).map((member, index) => (
                            <img
                                key={index}
                                src={member.avatar}
                                alt="Avatar"
                                className="w-8 h-8 bg-black bg-opacity-50 rounded-full border-2 border-white"
                                style={{ zIndex: group.members.length + index }}
                                />
                            ))}
                        </div>
                            <p>{group.groupName}</p>
                        </div>
                    </div> 
                ))}
                </div>
            </div>
        </div>
    </div>
    </>
  )
}

export default ChatList