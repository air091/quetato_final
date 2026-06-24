import React from "react";
import { NavLink } from "react-router-dom";
import HomeHeader from "../../components/home_comp/HomeHeader";
import HomeActivities from "../../components/home_comp/HomeActivities";

const Home = () => {
  return (
    <div className="">
      <HomeHeader />
      <HomeActivities />
    </div>
  );
};

export default Home;
