import React, { Children, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, BrowserRouter, Navigate, useNavigate } from 'react-router-dom';
import Home from './page/Home';
import Chat from './page/Chat';
import { useSelector } from 'react-redux';

const PrivateRoute = ({children}) => {
  const {currentUser} = useSelector(state => state.user);
  const isAuthenticated = currentUser;
  return isAuthenticated ? children : <Navigate to="/" />
}

const AuthRoute = ({children}) => {
  const {currentUser} = useSelector(state => state.user);
  const isAuthenticated = currentUser;
  return isAuthenticated ? <Navigate to={`/chats`}/> : children
}



const App = () => {
  const {currentUser} = useSelector(state => state.user);
  const navigate = useNavigate()
  useEffect(()=>{
    const isAuthenticated = currentUser;
    if(!isAuthenticated){
      navigate("/")
    }
  },[currentUser])
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <AuthRoute>
            <Home />
          </AuthRoute>
        } />
        <Route path="/chats" element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
