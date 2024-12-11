import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { persistor, store } from "./redux/store.js"
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SocketProvider } from "./context/SocketContext.jsx";
import RootApp from './App.jsx';


ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <SocketProvider>  
        <RootApp />
      </SocketProvider>
    </PersistGate>
  </Provider>
);
