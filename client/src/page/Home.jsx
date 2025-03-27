import { useState } from "react";
import AuthPage from "../components/AuthPage";

const Home = () => {
  const [pageState, setPageState] = useState("signin");

  return (
    <div className="w-screen flex flex-col justify-center items-center h-screen bg-gradient-to-b from-white via-blue-300 to-blue-500">
      <h1 className="font-heading font-bold text-6xl text-blue-500 text-center">
        Safe Talk
      </h1>
      <h2 className="font-slim text-2xl text-gray-700 text-center">
        Speak Freely, Stay Secure
      </h2>
      {pageState === "signin" ? (
        <AuthPage page="signin" setPageState={setPageState} />
      ) : (
        <AuthPage page="signup" setPageState={setPageState} />
      )}
    </div>
  );
};

export default Home;
