const mongoose = require("mongoose");

const FarmSettings = require("../models/FarmSettings");
const Gallery = require("../models/Gallery");
const Pond = require("../models/Pond");

const PUBLIC_TIME_ZONE = "Africa/Lagos";

const PUBLIC_GALLERY_LIMIT = 24;
const PUBLIC_POND_LIMIT = 50;

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const normalizeUrl = (value) => {
  const url = normalizeString(value);

  if (!url) {
    return "";
  }

  return url;
};

const getDefaultSocialLinks = () => ({
  facebook: "",
  instagram: "",
  whatsapp: "",
  tiktok: "",
  youtube: "",
  twitter: "",
});

const getPublicSettings = async () => {
  const settings = await FarmSettings.findOne({
    singletonKey: "default",
  }).lean();

  if (!settings) {
    return {
      farmName: "AZ Fish Farm",
      farmLogo: {
        url: "",
        publicId: "",
      },
      email: "",
      phone: "",
      address: "",
      about: "",
      socialLinks: getDefaultSocialLinks(),
      timeZone: PUBLIC_TIME_ZONE,
    };
  }

  return {
    farmName: normalizeString(settings.farmName) || "AZ Fish Farm",

    farmLogo: {
      url: normalizeUrl(settings.farmLogo?.url),
      publicId: normalizeString(settings.farmLogo?.publicId),
    },

    email: normalizeString(settings.email),

    phone: normalizeString(settings.phone),

    address: normalizeString(settings.address),

    about: normalizeString(settings.about),

    socialLinks: {
      facebook: normalizeUrl(settings.socialLinks?.facebook),

      instagram: normalizeUrl(settings.socialLinks?.instagram),

      whatsapp: normalizeUrl(settings.socialLinks?.whatsapp),

      tiktok: normalizeUrl(settings.socialLinks?.tiktok),

      youtube: normalizeUrl(settings.socialLinks?.youtube),

      twitter: normalizeUrl(settings.socialLinks?.twitter),
    },

    timeZone: PUBLIC_TIME_ZONE,
  };
};

const getPublicGallery = async ({
  category,
  page = 1,
  limit = PUBLIC_GALLERY_LIMIT,
} = {}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(
    Math.max(Number(limit) || PUBLIC_GALLERY_LIMIT, 1),
    PUBLIC_GALLERY_LIMIT,
  );

  const filter = {};

  if (category) {
    filter.category = String(category).trim().toLowerCase();
  }

  const [galleries, total] = await Promise.all([
    Gallery.find(filter)
      .select(
        "title description category imageUrl format width height createdAt updatedAt timeZone",
      )
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),

    Gallery.countDocuments(filter),
  ]);

  return {
    galleries: galleries.map((gallery) => ({
      _id: gallery._id,

      title: normalizeString(gallery.title),

      description: normalizeString(gallery.description),

      category: normalizeString(gallery.category),

      imageUrl: normalizeUrl(gallery.imageUrl),

      format: normalizeString(gallery.format),

      width: Number(gallery.width) || 0,

      height: Number(gallery.height) || 0,

      createdAt: gallery.createdAt,

      updatedAt: gallery.updatedAt,

      timeZone: gallery.timeZone || PUBLIC_TIME_ZONE,
    })),

    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  };
};

const getPublicPondOverview = async () => {
  const ponds = await Pond.find({
    status: "active",
  })
    .select(
      "name pondNumber pondType pondSize currentFishCount currentAverageWeight waterSource status",
    )
    .sort({
      pondNumber: 1,
      name: 1,
    })
    .limit(PUBLIC_POND_LIMIT)
    .lean();

  const totalPonds = ponds.length;

  const totalFishCount = ponds.reduce(
    (total, pond) => total + (Number(pond.currentFishCount) || 0),
    0,
  );

  const totalBiomassKg = ponds.reduce((total, pond) => {
    const fishCount = Number(pond.currentFishCount) || 0;

    const averageWeight = Number(pond.currentAverageWeight) || 0;

    return total + (fishCount * averageWeight) / 1000;
  }, 0);

  return {
    totalActivePonds: totalPonds,

    totalFishCount,

    totalBiomassKg: Number(totalBiomassKg.toFixed(3)),
  };
};

const getHomePageContent = async () => {
  const [settings, gallery, ponds] = await Promise.all([
    getPublicSettings(),

    getPublicGallery({
      page: 1,
      limit: 8,
    }),

    getPublicPondOverview(),
  ]);

  return {
    generatedAt: new Date(),

    timeZone: PUBLIC_TIME_ZONE,

    farm: settings,

    overview: ponds,

    featuredGallery: gallery.galleries,

    galleryPagination: gallery.pagination,
  };
};

const getAboutPageContent = async () => {
  const settings = await getPublicSettings();

  return {
    farmName: settings.farmName,

    farmLogo: settings.farmLogo,

    about: settings.about,

    email: settings.email,

    phone: settings.phone,

    address: settings.address,

    socialLinks: settings.socialLinks,

    timeZone: PUBLIC_TIME_ZONE,
  };
};

const getContactPageContent = async () => {
  const settings = await getPublicSettings();

  return {
    farmName: settings.farmName,

    logo: settings.farmLogo,

    email: settings.email,

    phone: settings.phone,

    address: settings.address,

    socialLinks: settings.socialLinks,

    timeZone: PUBLIC_TIME_ZONE,
  };
};

const getPublicWebsiteData = async ({
  category,
  page = 1,
  limit = PUBLIC_GALLERY_LIMIT,
} = {}) => {
  const [settings, gallery, ponds] = await Promise.all([
    getPublicSettings(),

    getPublicGallery({
      category,
      page,
      limit,
    }),

    getPublicPondOverview(),
  ]);

  return {
    generatedAt: new Date(),

    timeZone: PUBLIC_TIME_ZONE,

    farm: settings,

    overview: ponds,

    gallery: gallery.galleries,

    pagination: gallery.pagination,
  };
};

module.exports = {
  getPublicSettings,
  getPublicGallery,
  getPublicPondOverview,
  getHomePageContent,
  getAboutPageContent,
  getContactPageContent,
  getPublicWebsiteData,
  PUBLIC_TIME_ZONE,
};
