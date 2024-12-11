import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Home from './page/Home';
import Chat from './page/Chat';

const PrivateRoute = ({children}) => {
  const {currentUser} = useSelector(state => state.user);
  const isAuthenticated = currentUser;
  return isAuthenticated ? children : <Navigate to="/" />
}

const AuthRoute = ({children}) => {
  const {currentUser} = useSelector(state => state.user);
  const isAuthenticated = currentUser;
  return isAuthenticated ? <Navigate to="/chats"/> : children
}

const App = () => {
  const {currentUser} = useSelector(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = currentUser;
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [currentUser, navigate]);
  
  return (
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
  );
};

const RootApp = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default RootApp;
