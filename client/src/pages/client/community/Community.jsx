import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import Header from "../../../components/community_comp/Header";
import { useAuth } from "../../../hooks/useAuth";
import MainContent from "../../../components/community_comp/MainContent";

const Community = () => {
  const { accessToken } = useAuth();
  const { communityId } = useParams();
  const outletContext = useOutletContext();

  return (
    <>
      <Header communityId={communityId} accessToken={accessToken} />
      <MainContent outletContext={outletContext} />
    </>
  );
};

export default Community;
