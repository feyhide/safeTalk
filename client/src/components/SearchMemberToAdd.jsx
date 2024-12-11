import React, { useEffect, useState } from 'react'
import { useSocket } from '../context/SocketContext.jsx';
import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { DOMAIN } from '../constant/constant.js';
import { reset } from '../redux/chatSlice.js';
import { resetGroup } from '../redux/groupSlice.js';
import { resetUser } from '../redux/userSlice.js';

const SearchMemberToAdd = ({setAddMember}) => {
    const [searchName, setSearchName] = useState('');
    const [searchContacts,setSearchContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const { selectedgroup } = useSelector((state) => state.group);
    const {currentUser} = useSelector(state => state.user)

    const socket = useSocket();
    if (!socket) {
        return <div>Loading socket connection...</div>;
    }

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

            if (res.status === 401) {
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
    
    const handleAddMember = (userToAddId) => {
        socket.emit("addMemberToGroup", {
            requestUser: currentUser._id,
            userId: userToAddId,
            groupId: selectedgroup._id
        });
        setSearchContacts(prevContacts => prevContacts.filter(c => c._id !== userToAddId));
    };

    return (
    <div className='absolute z-50 w-full h-full flex items-center justify-center bg-white bg-opacity-50'>
        <Toaster/>
        <div className='w-1/2 h-1/2 bg-white rounded-xl'>
            <div className='w-ful h-full rounded-xl relative bg-white'>
                <img onClick={()=>setAddMember(false)} className='w-8 h-8 absolute top-5 left-5' src="/icons/crossblack.png"/>
                <div className='w-full h-full flex p-2 flex-col font-slim justify-center items-center'>
                    <div className='w-full h-[20%] flex flex-col items-center justify-center'>
                        <h1 className='font-semibold text-xl'>Add your connections</h1>
                        <div className='w-full bg-blue-200 rounded-xl px-2  flex items-center'>
                            @<input type='text' placeholder='username' onChange={(e)=>setSearchName(e.target.value)} value={searchName} className='w-full lowercase p-2 bg-transparent outline-none' />
                        </div>
                    </div>
                    <div className='w-full h-[50%] overflow-y-auto'>
                    {searchContacts?.map((contact,index)=>(
                        <div key={index} className='w-full flex justify-between items-center py-2'>
                            <div className='w-auto flex h-full items-center gap-2'>
                                <img src={contact.avatar} className='w-8 h-8 rounded-full border-2'/>
                                <p>@{contact.username}</p>
                            </div>
                            <div className='w-auto'>
                                <button onClick={() => handleAddMember(contact._id)} className="p-2 bg-green-500 text-white rounded-xl">Add</button>
                            </div>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default SearchMemberToAdd