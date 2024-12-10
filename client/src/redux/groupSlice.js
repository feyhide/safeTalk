import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    selectedgroup: null,
    groupData: [],
    page:1,
    total:15
};

const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        updatePageAndTotal: (state,action) => {
            state.page = action.payload.page;
            state.total = action.payload.total;
        },
        addGroup: (state, action) => {
            state.selectedgroup = action.payload;
        },
        addGroupData: (state, action) => {
            state.groupData = action.payload;
        },
        appendMember: (state,action) => {
            state.selectedgroup.members.push(action.payload);
        },
        appendMessageGroup: (state, action) => {
            if (state.selectedgroup) {
                if (!Array.isArray(state.groupData)) {
                    state.groupData = [];
                }

                const messagePayload = action.payload;

                if (
                    messagePayload &&
                    typeof messagePayload === 'object' &&
                    messagePayload.sender &&
                    messagePayload.groupId &&
                    messagePayload.message
                ) {
                    state.groupData.push(messagePayload);
                } else {
                    console.warn('Invalid message format', messagePayload);
                }
            }
        },
        appendOlderMessagesGroup: (state, action) => {
            if (state.selectedgroup) {
                if (!Array.isArray(state.groupData)) {
                    state.groupData = [];
                }
        
                const olderMessages = action.payload; 
        
                if (Array.isArray(olderMessages)) {
                    state.groupData = [...olderMessages, ...state.groupData];
                } else {
                    console.warn('Invalid older messages format', olderMessages);
                }
            }
        },        
        resetGroup: (state) => {
            state.selectedgroup = null;
            state.groupData = [];
            state.page = 0;
            state.total = 0;
        },
        refreshgroup: (state) => {
            state.groupData = [];
            state.page = 0;
            state.total = 0;
        },
    },
});

export const { resetGroup,updatePageAndTotal, addGroup,appendMember, addGroupData, appendMessageGroup, appendOlderMessagesGroup,refreshgroup} = groupSlice.actions;
export default groupSlice.reducer;
