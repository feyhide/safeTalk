import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentUser: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    addUser: (state, action) => {
      state.currentUser = action.payload;
    },
    resetUser: (state) => {
      state.currentUser = null;
    },
  },
});

export const { addUser, resetUser } = userSlice.actions;

export default userSlice.reducer;
