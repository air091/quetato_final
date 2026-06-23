import { request, response } from "express";
import {
  getAllCommunities,
  getCommunityById,
} from "../services/community.service.js";
import { AppError } from "../libs/errorHandle.js";

export const getAllCommunitiesController = async (request, response) => {
  try {
    const communities = await getAllCommunities();
    return response.status(200).json({ success: true, communities });
  } catch (error) {
    console.error("Get all communities failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};

export const getCommunityByIdController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const community = await getCommunityById(communityId);
    return response.status(200).json({ success: true, community });
  } catch (error) {
    console.error("Get community failed", error);
    let errMessage = "Internal server error";
    let statusCode = 500;

    if (error instanceof AppError) {
      errMessage = error.message;
      statusCode = error.statusCode;
    }

    return response
      .status(statusCode)
      .json({ success: false, message: errMessage });
  }
};
