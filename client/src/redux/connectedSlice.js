import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  connectedGroups: null,
  connectedPeoples: null,
};

const connectedSlice = createSlice({
  name: "connections",
  initialState,
  reducers: {
    appendOlderGroups: (state, action) => {
      if (!Array.isArray(state.connectedGroups)) {
        state.connectedGroups = [];
      }

      const { groups, page } = action.payload;

      if (!groups && !page) {
        console.log("Bad Request in appending older groups");
      }

      if (state.connectedGroups.some((g) => g.page === page)) {
        return;
      }

      if (Array.isArray(groups)) {
        state.connectedGroups.push({ page, groups });
      } else {
        console.warn("Invalid older groups format", groups);
      }
    },
    appendOlderPeoples: (state, action) => {
      if (!Array.isArray(state.connectedPeoples)) {
        state.connectedPeoples = [];
      }

      const { peoples, page } = action.payload;

      if (!peoples && !page) {
        console.log("Bad Request in appending older peoples");
      }

      if (state.connectedPeoples.some((g) => g.page === page)) {
        return;
      }

      if (Array.isArray(peoples)) {
        state.connectedPeoples.push({ page, peoples });
      } else {
        console.warn("Invalid older groups format", peoples);
      }
    },
    appendConnection: (state, action) => {
      if (!Array.isArray(state.connectedPeoples)) {
        state.connectedPeoples = [];
      }

      const connectionPayload = action.payload;
      if (
        connectionPayload &&
        typeof connectionPayload === "object" &&
        connectionPayload._id &&
        Array.isArray(connectionPayload.members)
      ) {
        if (state.connectedPeoples.length > 0) {
          state.connectedPeoples[0].peoples.unshift(connectionPayload);
        } else {
          state.connectedPeoples.unshift({
            page: 1,
            peoples: [connectionPayload],
          });
        }
      } else {
        console.warn("Invalid connection format", connectionPayload);
      }
    },

    appendGroup: (state, action) => {
      if (!Array.isArray(state.connectedGroups)) {
        state.connectedGroups = [];
      }

      const groupPayload = action.payload;
      if (
        groupPayload &&
        typeof groupPayload === "object" &&
        groupPayload._id &&
        groupPayload.groupName &&
        Array.isArray(groupPayload.members)
      ) {
        if (state.connectedGroups.length > 0) {
          state.connectedGroups[0].groups.unshift(groupPayload);
        } else {
          state.connectedGroups.unshift({
            page: 1,
            peoples: [groupPayload],
          });
        }
      } else {
        console.warn("Invalid group format", groupPayload);
      }
    },
    updateConnectedGroup: (state, action) => {
      if (!state.connectedGroups) {
        state.connectedGroups = [];
      }

      const groupToUpdate = action.payload;
      if (!groupToUpdate || !groupToUpdate._id) {
        console.error("Invalid payload:", action.payload);
        return;
      }

      const groupIndex = state.connectedGroups.findIndex(
        (group) => group._id === groupToUpdate._id
      );

      if (groupIndex !== -1) {
        state.connectedGroups[groupIndex] = groupToUpdate;
      } else {
        state.connectedGroups.push(groupToUpdate);
      }
    },
    removeConnection: (state, action) => {
      state.connectedPeoples = state.connectedPeoples.filter(
        (connection) => connection.userId._id !== action.payload
      );
    },
  },
});

export const {
  appendGroup,
  appendConnection,
  updateConnectedGroup,
  removeConnection,
  appendOlderGroups,
  appendOlderPeoples,
} = connectedSlice.actions;

export default connectedSlice.reducer;
