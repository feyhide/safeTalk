import {createSlice} from '@reduxjs/toolkit'

const initialState = {
    currentUser:null
}

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        addUser:(state,action)=>{
            state.currentUser = action.payload;
        },
        resetUser:(state)=>{
            state.currentUser = null
        },
        appendConnection: (state, action) => {
            if (state.currentUser) {
                if (!state.currentUser.connectedPeoples){
                    state.currentUser.connectedPeoples = [];
                }
                
                if (Array.isArray(action.payload)) {
                    state.currentUser.connectedPeoples.push(...action.payload);
                } else {
                    state.currentUser.connectedPeoples.push(action.payload);
                }
            }
        },
        appendGroup: (state, action) => {
            if (state.currentUser) {
                if (!state.currentUser.connectedGroups){
                    state.currentUser.connectedGroups = [];
                }
                
                if (Array.isArray(action.payload)) {
                    state.currentUser.connectedGroups.push(...action.payload);
                } else {
                    state.currentUser.connectedGroups.push(action.payload);
                }
            }
        },
        updateConnectedGroup: (state, action) => {
            if (state.currentUser) {
                if (!state.currentUser.connectedGroups) {
                    state.currentUser.connectedGroups = [];
                }
        
                const groupToUpdate = action.payload; 
                if (!groupToUpdate || !groupToUpdate._id) {
                    console.error("Invalid payload:", action.payload);
                    return;
                }
        
                const groupIndex = state.currentUser.connectedGroups.findIndex(
                    (group) => group._id === groupToUpdate._id
                );
        
                if (groupIndex !== -1) {
                    state.currentUser.connectedGroups[groupIndex] = groupToUpdate;
                } else {
                    state.currentUser.connectedGroups.push(groupToUpdate);
                }
            }
        },
        removeConnection: (state, action) => {
            if (state.currentUser) {
                state.currentUser.connectedPeoples = state.currentUser.connectedPeoples.filter(
                    (connection) => connection.userId._id !== action.payload
                );
            }
        },
        
    }
})

export const {
    addUser,
    resetUser,
    appendGroup,
    appendConnection,
    updateConnectedGroup,
    removeConnection
} = userSlice.actions

export default userSlice.reducer