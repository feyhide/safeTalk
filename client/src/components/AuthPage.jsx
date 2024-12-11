import axios from 'axios';
import React, { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addUser, resetUser } from '../redux/userSlice';
import { DOMAIN } from '../constant/constant.js';
import { reset } from '../redux/chatSlice.js';
import { resetGroup } from '../redux/groupSlice.js';

const AuthPage = ({page,setPageState}) => {
    const dispatch = useDispatch()
    const [otp,setOtp] = useState(null);
    const navigate = useNavigate();
    const [otpState,setotpState] = useState(false);
    const [showPassword,setshowPassword] = useState(false);
    const [loading,setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value
        }));
    };

    const userAuthServer = async (formData) => {
        setLoading(true);
        try {

            let res;
            const filteredFormData = { ...formData };
            if (page === "signin") {
                delete filteredFormData.username;
                res = await fetch(DOMAIN+`api/v1/auth/sign-in`,
                    {
                        method: "POST",
                        credentials: 'include',
                        headers: {
                            'Content-Type':'application/json'
                        },
                        body: JSON.stringify(filteredFormData)
                    }
                )
            }else{
                res = await fetch(DOMAIN+`api/v1/auth/sign-up`,
                    {
                        method: "POST",
                        headers: {
                            'Content-Type':'application/json'
                        },
                        body: JSON.stringify(filteredFormData)
                    }
                )
            }
            const data = await res.json()
            if (res.status === 401 || res.status === 403) {
                console.warn('Session expired. Redirecting to login...');
                dispatch(reset())
                dispatch(resetGroup())
                dispatch(resetUser())
                window.location.href = '/';
                return;
            }
            if(data.success){
                if(data.message.includes("OTP")){
                    setotpState(true);
                }else{
                    dispatch(addUser(data.data))
                    navigate(`/chats`);
                }
                toast.success(data.message);
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log("sign up/in error :",error)
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setLoading(false); 
        }
    };
    const handleSubmit = async () => {
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d]{6,20}$/;
        const usernameRegex = /^[a-z][a-z0-9_]*$/
        const {email, password, username } = formData;

        username.toLocaleLowerCase();

        if (page === 'signup') {
            if (!username) {
                return toast.error("Username is required.");
            }
            if(!usernameRegex.test(username)){
                return toast.error("Username must start with a letter and contain only lowercase letters, numbers, or underscores.")
            }
            if(username.length < 3){
                return toast.error("Username is must be 3 letters long.");
            }
        }
        if (!email.length) {
            return toast.error("Email is required.");
        }
        if (!emailRegex.test(email)) {
            return toast.error("Email is invalid.");
        }
        if (!passwordRegex.test(password)) {
            return toast.error("Password should be 6-20 characters long with at least one numeric digit, one lowercase, one uppercase letter, and no special characters.");
        }
        userAuthServer(formData);
    };

    const handleVerifyOtp = async () => {
        setLoading(true);
        try {
            const otpregex = /^\d{6}$/;
            if(!otpregex.test(otp)){
                return toast.error("OTP is invalid.");
            }

            const res = await fetch(DOMAIN+`api/v1/auth/verify-otp`,
                {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        'Content-Type':'application/json'
                    },
                    body: JSON.stringify({email:formData.email,otp})
                }
            )
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
                toast.success(data.message);
                dispatch(addUser(data.data));
                setotpState(false)
                setPageState("signin");
            }else{
                toast.error(data.message);
            }
        } catch (error) {
            console.log("verifying otp error :",error)
            toast.error(error.response?.data?.message || "An error occurred");
        } finally {
            setLoading(false); 
        }
    }

    useEffect(()=>{
        setFormData({
            username: '',
            email: '',
            password: ''
        });
        setOtp(null);
    },[page])

    return (
    <>
    <Toaster/>
    <div className='w-[70vw] relative md:w-[60vw] lg:w-[50vw] p-5 gap-2 min-h-[50vh] bg-white bg-opacity-35 m-2 rounded-xl flex flex-col items-center justify-center'>
        {!otpState ? (
            <>
            <p className='font-heading tracking-tight text-gray-700 font-bold text-3xl md:text-4xl'>{page === "signin" ? "Sign In" : "Sign Up"}</p>
            {page === "signup" && (
                <div className='w-full flex font-slim flex-col'>
                    <label className='text-xs md:text-lg'>Username</label>
                    <input onChange={handleChange} name='username' value={formData.username} type='text' placeholder='Username' className='outline-none bg-white bg-opacity-30 p-2 rounded-xl text-xs lowercase md:text-base'/>
                </div>
            )}
            <div className='w-full flex font-slim flex-col'>
                <label className='text-gray-700 text-xs md:text-lg'>Email</label>
                <input onChange={handleChange} name='email' value={formData.email} type='email' placeholder='Email' className='outline-none bg-white bg-opacity-30 p-2 rounded-xl text-xs md:text-base'/>
            </div>
            <div className='w-full flex font-slim flex-col'>
                <label className=' text-gray-700 text-xs md:text-lg'>Password</label>
                <div className='w-full flex relative flex-col'>
                    <img onClick={()=>setshowPassword(!showPassword)} src={showPassword ? "/icons/crosseye.png" : "/icons/eye.png"} className="w-4 md:w-5 h-4 md:h-5 absolute top-1/2 right-5 -translate-y-1/2"/>
                    <input onChange={handleChange} name='password' value={formData.password} type={showPassword ? "text" : "password"} placeholder='Password' className='outline-none bg-white bg-opacity-30 p-2 rounded-xl text-xs md:text-base'/>
                </div>
            </div>
            <div className='w-full flex gap-2 flex-col items-center justify-center font-slim'>
                <button disabled={loading} onClick={handleSubmit} className='bg-blue-400 md:text-lg text-white py-1 px-5 rounded-xl'>
                    {loading ? "Loading..." : page === "signin" ? "Sign In" : "Sign Up"}
                </button>
                <p onClick={()=>setPageState(page === "signin" ? "signup" : "signin")} className='text-xs sm:text-sm md:text-base underline text-gray-700 hover:text-blue-600'>{page === 'signin' ? "New Here ? Why not create an account and join us" : "Already Have Joined ? Just sign in then"}</p>
            </div>
            </>
        ):(
            <>
            <p className='font-heading tracking-tight font-bold text-3xl'>Verify OTP</p>
            <img src='/icons/back.png' className='absolute left-2 top-5 w-8 h-8' onClick={()=>{setOtp(null),setotpState(false)}}/>
            <div className='w-full flex font-slim flex-col'>
                <label className='text-xs'>OTP</label>
                <input onChange={(e)=>setOtp(e.target.value)} type='number' inputMode='numeric' placeholder='OTP' name='otp' className='outline-none no-spinner bg-white bg-opacity-30 p-2 rounded-xl text-xs md:text-base'/>
            </div>
            <div className='w-full flex gap-2 flex-col items-center justify-center font-slim'>
                <button disabled={loading} onClick={handleVerifyOtp} className='bg-blue-400 md:text-lg text-white py-1 px-5 rounded-xl'>
                    {loading ? "Verifying..." : "Verify"}
                </button>
            </div>
            </>
        )}
    </div>
    </>
  )
}

export default AuthPage