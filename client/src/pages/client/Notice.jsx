import React, { useEffect } from "react";
import Updates from "./notice/Updates";
import {
  NOTICE_UPDATE_SEEN_EVENT,
  NOTICE_UPDATE_STORAGE_KEY,
} from "../../components/home_comp/Sidebar";

const Notice = () => {
  useEffect(() => {
    window.localStorage.setItem(NOTICE_UPDATE_STORAGE_KEY, "true");
    window.dispatchEvent(new Event(NOTICE_UPDATE_SEEN_EVENT));
  }, []);

  return <div>
    <Updates />
  </div>;
};

export default Notice;
