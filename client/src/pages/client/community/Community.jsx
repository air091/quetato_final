import React from "react";
import { useParams } from "react-router-dom";
import Header from "../../../components/community_comp/Header";
import { useAuth } from "../../../hooks/useAuth";

const Community = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  return (
    <>
      <Header communityId={communityId} accessToken={accessToken} />
    </>
  );
};

export default Community;
