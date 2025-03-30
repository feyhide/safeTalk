import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedgroup: null,
  groupData: [],
};

const groupSlice = createSlice({
  name: "group",
  initialState,
  reducers: {
    addGroup: (state, action) => {
      state.selectedgroup = action.payload;
    },
    addGroupData: (state, action) => {
      state.groupData = action.payload;
    },
    appendMember: (state, action) => {
      state.selectedgroup.members.push(action.payload);
    },
    appendMessageGroup: (state, action) => {
      if (state.selectedgroup) {
        if (!Array.isArray(state.chatData)) {
          state.chatData = [];
        }

        const messagePayload = action.payload;
        if (
          messagePayload &&
          typeof messagePayload === "object" &&
          messagePayload.sender &&
          messagePayload.groupId &&
          messagePayload.createdAt &&
          messagePayload.message &&
          messagePayload._id
        ) {
          if (state.groupData.length > 0) {
            state.groupData[0].messages.unshift(messagePayload);
          } else {
            state.groupData.unshift({
              page: 1,
              messages: [messagePayload],
            });
          }
        } else {
          console.warn("Invalid message format", messagePayload);
        }
      }
    },
    appendOlderMessagesGroup: (state, action) => {
      if (!state.selectedgroup) return;

      if (!Array.isArray(state.groupData)) {
        state.groupData = [];
      }

      const { messages, page } = action.payload;

      if (state.groupData.some((p) => p.page === page)) {
        return;
      }

      if (Array.isArray(messages)) {
        state.groupData.push({ page, messages });
      } else {
        console.warn("Invalid older messages format", messages);
      }
    },
    updateSelectedGroup: (state, action) => {
      if (!state.selectedgroup) return;

      const request = action.payload;

      if (state.selectedgroup._id === request._id) {
        state.selectedgroup = request;
      }
    },
    resetGroup: (state) => {
      state.selectedgroup = null;
      state.groupData = [];
    },
    refreshgroup: (state) => {
      state.groupData = [];
    },
  },
});

export const {
  resetGroup,
  updatePageAndTotal,
  updateSelectedGroup,
  addGroup,
  appendMember,
  addGroupData,
  appendMessageGroup,
  appendOlderMessagesGroup,
  refreshgroup,
} = groupSlice.actions;
export default groupSlice.reducer;
