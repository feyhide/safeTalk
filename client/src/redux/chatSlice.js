import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedChat: null,
  chatData: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
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
          typeof messagePayload === "object" &&
          messagePayload.sender &&
          messagePayload.recipient &&
          messagePayload.message
        ) {
          if (state.chatData.length > 0) {
            state.chatData[0].messages.unshift(messagePayload);
          } else {
            state.chatData.unshift({
              page: 1,
              messages: [messagePayload],
            });
          }
        } else {
          console.warn("Invalid message format", messagePayload);
        }
      }
    },
    appendOlderMessages: (state, action) => {
      if (!state.selectedChat) return;

      if (!Array.isArray(state.chatData)) {
        state.chatData = [];
      }

      const { messages, page } = action.payload;

      if (state.chatData.some((p) => p.page === page)) {
        return;
      }

      if (Array.isArray(messages)) {
        state.chatData.push({ page, messages });
      } else {
        console.warn("Invalid older messages format", messages);
      }
    },

    reset: (state) => {
      state.selectedChat = null;
      state.chatData = [];
    },
    refreshChat: (state) => {
      state.chatData = [];
    },
  },
});

export const {
  reset,
  addChatuser,
  addChatData,
  appendMessage,
  appendOlderMessages,
  refreshChat,
} = chatSlice.actions;
export default chatSlice.reducer;
