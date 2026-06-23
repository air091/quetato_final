import { request, response } from "express";
import {
  createCommunity,
  deleteCommunity,
  getAllCommunities,
  getCommunityById,
  updateCommunityByOwner,
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

export const createCommunityController = async (request, response) => {
  try {
    const { name, description } = request.body;

    const community = await createCommunity(
      name,
      description,
      request.user.sub,
    );

    return response.status(201).json({ success: true, community });
  } catch (error) {
    console.error("Create community failed", error);
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

export const updateCommunityByOwnerController = async (request, response) => {
  try {
    const { communityId } = request.params;
    const { name, description } = request.body;

    const community = await updateCommunityByOwner(
      communityId,
      name,
      description,
      request.user.sub,
    );

    return response.status(200).json({ success: true, community });
  } catch (error) {
    console.error("Update community failed", error);
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

export const deleteCommunityController = async (request, response) => {
  try {
    const { communityId } = request.params;
    await deleteCommunity(communityId, request.user.sub);

    return response.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete community failed", error);
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
