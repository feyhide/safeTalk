import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedChat: null,
    chatData: [],
    page:1,
    total:15
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        updatePageAndTotal: (state,action) => {
            state.page = action.payload.page;
            state.total = action.payload.total;
        },
        addChatuser: (state, action) => {
            state.selectedChat = action.payload;
        },
        addChatData: (state, action) => {
            state.chatData = action.payload;
        },
        appendMessage: (state, action) => {
            if (state.selectedChat) {
                if (!Array.isArray(state.chatData)) {
                    state.chatData = [];
                }

                const messagePayload = action.payload;
                if (
                    messagePayload &&
                    typeof messagePayload === 'object' &&
                    messagePayload.sender &&
                    messagePayload.recipient &&
                    messagePayload.message 
                ) {
                    state.chatData.push(messagePayload);
                } else {
                    console.warn('Invalid message format', messagePayload);
                }
            }
        },
        appendOlderMessages: (state, action) => {
            if (state.selectedChat) {
                if (!Array.isArray(state.chatData)) {
                    state.chatData = [];
                }
        
                const olderMessages = action.payload; 
        
                if (Array.isArray(olderMessages)) {
                    state.chatData = [...olderMessages, ...state.chatData];
                } else {
                    console.warn('Invalid older messages format', olderMessages);
                }
            }
        },
        
        reset: (state) => {
            state.selectedChat = null;
            state.chatData = [];
            state.page = 0;
            state.total = 0;
        },
        refreshChat: (state) => {
            state.chatData = [];
            state.page = 0;
            state.total = 0;
        },
    },
});

export const { updatePageAndTotal,reset, addChatuser, addChatData, appendMessage, appendOlderMessages,refreshChat} = chatSlice.actions;
export default chatSlice.reducer;
