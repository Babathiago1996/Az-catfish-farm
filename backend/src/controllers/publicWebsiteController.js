const asyncHandler = require("../utils/asyncHandler");

const {
  successResponse,
} = require("../utils/apiResponse");

const publicWebsiteService = require("../services/publicWebsiteService");

const getHomePage =
  asyncHandler(
    async (req, res) => {
      const content =
        await publicWebsiteService.getHomePageContent();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public website home content retrieved successfully.",

          data: {
            content,
          },
        },
      );
    },
  );

const getAboutPage =
  asyncHandler(
    async (req, res) => {
      const about =
        await publicWebsiteService.getAboutPageContent();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public farm information retrieved successfully.",

          data: {
            about,
          },
        },
      );
    },
  );

const getContactPage =
  asyncHandler(
    async (req, res) => {
      const contact =
        await publicWebsiteService.getContactPageContent();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public contact information retrieved successfully.",

          data: {
            contact,
          },
        },
      );
    },
  );

const getGallery =
  asyncHandler(
    async (req, res) => {
      const gallery =
        await publicWebsiteService.getPublicGallery(
          {
            category:
              req.query.category,

            page:
              req.query.page,

            limit:
              req.query.limit,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public gallery retrieved successfully.",

          data: gallery,
        },
      );
    },
  );

const getPondOverview =
  asyncHandler(
    async (req, res) => {
      const overview =
        await publicWebsiteService.getPublicPondOverview();

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public farm overview retrieved successfully.",

          data: {
            overview,
          },
        },
      );
    },
  );

const getPublicWebsiteData =
  asyncHandler(
    async (req, res) => {
      const content =
        await publicWebsiteService.getPublicWebsiteData(
          {
            category:
              req.query.category,

            page:
              req.query.page,

            limit:
              req.query.limit,
          },
        );

      return successResponse(
        res,
        {
          statusCode: 200,

          message:
            "Public website content retrieved successfully.",

          data: {
            content,
          },
        },
      );
    },
  );

module.exports = {
  getHomePage,
  getAboutPage,
  getContactPage,
  getGallery,
  getPondOverview,
  getPublicWebsiteData,
};