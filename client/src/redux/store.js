import {configureStore,combineReducers} from '@reduxjs/toolkit'
import {persistReducer,persistStore} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import userReducer from './userSlice.js'
import chatReducer from './chatSlice.js'
import groupReducer from './groupSlice.js'

const rootReducer = combineReducers({user:userReducer,chat:chatReducer,group:groupReducer})

const persistConfig = {
    key: 'root',
    storage,
    version:1,
}

const persistedReducer = persistReducer(persistConfig,rootReducer)

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck:false
        }),
})

export const persistor = persistStore(store);