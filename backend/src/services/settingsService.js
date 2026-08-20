const Admin = require("../models/Admin");
const FarmSettings = require("../models/FarmSettings");
const ActivityLog = require("../models/ActivityLog");
const cloudinary = require("../config/cloudinary");

const SINGLETON_KEY = "default";
const TIME_ZONE = "Africa/Lagos";

const uploadBufferToCloudinary = (
  buffer,
  folder,
) =>
  new Promise((resolve, reject) => {
    const stream =
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result);
        },
      );

    stream.end(buffer);
  });

const deleteCloudinaryImage = async (
  publicId,
) => {
  if (!publicId) return;

  await cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: "image",
      invalidate: true,
    },
  );
};

const logSettingsActivity = async ({
  entityType,
  entityId,
  description,
  metadata,
  ipAddress,
  userAgent,
}) => {
  try {
    await ActivityLog.create({
      action: "settings_update",
      entityType,
      entityId: entityId || null,
      description,
      metadata: metadata || null,
      ipAddress: ipAddress || "",
      userAgent: userAgent || "",
    });
  } catch (error) {
    console.error(
      "Settings activity log failed:",
      error,
    );
  }
};

const getOrCreateFarmSettings =
  async () => {
    let settings =
      await FarmSettings.findOne({
        singletonKey: SINGLETON_KEY,
      });

    if (!settings) {
      settings =
        await FarmSettings.create({
          singletonKey: SINGLETON_KEY,
          farmName: "AZ Fish Farm",
          timeZone: TIME_ZONE,
          currency: "NGN",
        });
    }

    return settings;
  };

const buildFarmSettings = (
  settings,
) => ({
  id: settings._id,

  singletonKey:
    settings.singletonKey,

  farmName:
    settings.farmName,

  farmLogo: {
    url:
      settings.farmLogo?.url || "",

    publicId:
      settings.farmLogo?.publicId || "",
  },

  email:
    settings.email || "",

  phone:
    settings.phone || "",

  address:
    settings.address || "",

  about:
    settings.about || "",

  socialLinks: {
    facebook:
      settings.socialLinks
        ?.facebook || "",

    instagram:
      settings.socialLinks
        ?.instagram || "",

    whatsapp:
      settings.socialLinks
        ?.whatsapp || "",

    tiktok:
      settings.socialLinks
        ?.tiktok || "",

    youtube:
      settings.socialLinks
        ?.youtube || "",

    twitter:
      settings.socialLinks
        ?.twitter || "",
  },

  waterChangeIntervalDays:
    Number(
      settings.waterChangeIntervalDays ||
        7,
    ),

  currency:
    settings.currency || "NGN",

  timeZone:
    settings.timeZone ||
    TIME_ZONE,

  feedingSchedule: {
    morning: {
      enabled: Boolean(
        settings.feedingSchedule
          ?.morning?.enabled,
      ),

      time:
        settings.feedingSchedule
          ?.morning?.time ||
        "08:00",
    },

    afternoon: {
      enabled: Boolean(
        settings.feedingSchedule
          ?.afternoon?.enabled,
      ),

      time:
        settings.feedingSchedule
          ?.afternoon?.time ||
        "14:00",
    },

    evening: {
      enabled: Boolean(
        settings.feedingSchedule
          ?.evening?.enabled,
      ),

      time:
        settings.feedingSchedule
          ?.evening?.time ||
        "18:00",
    },
  },

  notificationPreferences: {
    emailNotifications:
      Boolean(
        settings
          .notificationPreferences
          ?.emailNotifications,
      ),

    inAppNotifications:
      Boolean(
        settings
          .notificationPreferences
          ?.inAppNotifications,
      ),

    waterChangeReminders:
      Boolean(
        settings
          .notificationPreferences
          ?.waterChangeReminders,
      ),

    feedingReminders:
      Boolean(
        settings
          .notificationPreferences
          ?.feedingReminders,
      ),

    growthReminders:
      Boolean(
        settings
          .notificationPreferences
          ?.growthReminders,
      ),

    harvestReminders:
      Boolean(
        settings
          .notificationPreferences
          ?.harvestReminders,
      ),

    inventoryAlerts:
      Boolean(
        settings
          .notificationPreferences
          ?.inventoryAlerts,
      ),

    monthlyReportNotifications:
      Boolean(
        settings
          .notificationPreferences
          ?.monthlyReportNotifications,
      ),
  },

  createdAt:
    settings.createdAt,

  updatedAt:
    settings.updatedAt,
});

const getSettings = async ({
  adminId,
}) => {
  const [admin, settings] =
    await Promise.all([
      Admin.findById(adminId),
      getOrCreateFarmSettings(),
    ]);

  if (!admin || !admin.isActive) {
    const error = new Error(
      "Administrator account is unavailable.",
    );

    error.code =
      "ADMIN_NOT_FOUND";

    throw error;
  }

  return {
    generatedAt: new Date(),

    timeZone:
      settings.timeZone ||
      TIME_ZONE,

    adminProfile:
      admin.toSafeObject(),

    account: {
      email: admin.email,
      isActive: admin.isActive,
      lastLoginAt:
        admin.lastLoginAt,
      passwordChangedAt:
        admin.passwordChangedAt,
      createdAt:
        admin.createdAt,
      updatedAt:
        admin.updatedAt,
    },

    farm:
      buildFarmSettings(
        settings,
      ),
  };
};

const updateFarmSettings = async ({
  adminId,
  data = {},
  ipAddress,
  userAgent,
}) => {
  const settings =
    await getOrCreateFarmSettings();

  const allowedFields = [
    "farmName",
    "email",
    "phone",
    "address",
    "about",
    "waterChangeIntervalDays",
    "currency",
    "timeZone",
  ];

  for (const field of allowedFields) {
    if (
      data[field] !== undefined
    ) {
      settings[field] =
        data[field];
    }
  }

  if (data.socialLinks) {
    settings.socialLinks = {
      ...(settings.socialLinks
        ?.toObject?.() || {}),
      ...data.socialLinks,
    };
  }

  if (
    data.notificationPreferences
  ) {
    settings.notificationPreferences =
      {
        ...(settings
          .notificationPreferences
          ?.toObject?.() || {}),
        ...data.notificationPreferences,
      };
  }

  if (data.feedingSchedule) {
    const current =
      settings.feedingSchedule ||
      {};

    settings.feedingSchedule = {
      morning: {
        ...(current.morning
          ?.toObject?.() ||
          current.morning ||
          {}),

        ...(data.feedingSchedule
          .morning || {}),
      },

      afternoon: {
        ...(current.afternoon
          ?.toObject?.() ||
          current.afternoon ||
          {}),

        ...(data.feedingSchedule
          .afternoon || {}),
      },

      evening: {
        ...(current.evening
          ?.toObject?.() ||
          current.evening ||
          {}),

        ...(data.feedingSchedule
          .evening || {}),
      },
    };
  }

  await settings.save();

  await logSettingsActivity({
    entityType:
      "FarmSettings",

    entityId:
      settings._id,

    description:
      "Farm settings were updated.",

    metadata: {
      section: "farm",
      fields:
        Object.keys(data),
      adminId,
    },

    ipAddress,
    userAgent,
  });

  return buildFarmSettings(
    settings,
  );
};

const updateNotifications =
  async ({
    adminId,
    data = {},
    ipAddress,
    userAgent,
  }) => {
    const settings =
      await getOrCreateFarmSettings();

    settings.notificationPreferences =
      {
        ...(settings
          .notificationPreferences
          ?.toObject?.() || {}),
        ...data,
      };

    await settings.save();

    await logSettingsActivity({
      entityType:
        "FarmSettings",

      entityId:
        settings._id,

      description:
        "Notification preferences were updated.",

      metadata: {
        section:
          "notifications",

        adminId,

        fields:
          Object.keys(data),
      },

      ipAddress,
      userAgent,
    });

    return buildFarmSettings(
      settings,
    ).notificationPreferences;
  };

const updateFeedingSchedule =
  async ({
    adminId,
    data = {},
    ipAddress,
    userAgent,
  }) => {
    const settings =
      await getOrCreateFarmSettings();

    const current =
      settings.feedingSchedule ||
      {};

    settings.feedingSchedule = {
      morning: {
        ...(current.morning
          ?.toObject?.() ||
          current.morning ||
          {}),

        ...(data.morning || {}),
      },

      afternoon: {
        ...(current.afternoon
          ?.toObject?.() ||
          current.afternoon ||
          {}),

        ...(data.afternoon || {}),
      },

      evening: {
        ...(current.evening
          ?.toObject?.() ||
          current.evening ||
          {}),

        ...(data.evening || {}),
      },
    };

    await settings.save();

    await logSettingsActivity({
      entityType:
        "FarmSettings",

      entityId:
        settings._id,

      description:
        "Feeding schedule was updated.",

      metadata: {
        section:
          "feeding_schedule",

        adminId,
      },

      ipAddress,
      userAgent,
    });

    return buildFarmSettings(
      settings,
    ).feedingSchedule;
  };

const updateFarmLogo = async ({
  adminId,
  file,
  ipAddress,
  userAgent,
}) => {
  if (!file?.buffer) {
    const error = new Error(
      "Farm logo image is required.",
    );

    error.code =
      "IMAGE_REQUIRED";

    throw error;
  }

  const uploadResult =
    await uploadBufferToCloudinary(
      file.buffer,
      "az-fish-farm/settings/farm-logo",
    );

  if (
    !uploadResult?.secure_url ||
    !uploadResult?.public_id
  ) {
    const error = new Error(
      "Farm logo upload failed.",
    );

    error.code =
      "CLOUDINARY_UPLOAD_FAILED";

    throw error;
  }

  const settings =
    await getOrCreateFarmSettings();

  const oldPublicId =
    settings.farmLogo?.publicId ||
    "";

  try {
    settings.farmLogo = {
      url:
        uploadResult.secure_url,

      publicId:
        uploadResult.public_id,
    };

    await settings.save();
  } catch (error) {
    try {
      await deleteCloudinaryImage(
        uploadResult.public_id,
      );
    } catch (cleanupError) {
      console.error(
        "Cloudinary cleanup failed:",
        cleanupError,
      );
    }

    throw error;
  }

  if (
    oldPublicId &&
    oldPublicId !==
      uploadResult.public_id
  ) {
    try {
      await deleteCloudinaryImage(
        oldPublicId,
      );
    } catch (error) {
      console.error(
        "Old farm logo deletion failed:",
        error,
      );
    }
  }

  await logSettingsActivity({
    entityType:
      "FarmSettings",

    entityId:
      settings._id,

    description:
      "Farm logo was updated.",

    metadata: {
      section: "farm",
      field: "farmLogo",
      adminId,
    },

    ipAddress,
    userAgent,
  });

  return buildFarmSettings(
    settings,
  ).farmLogo;
};

const removeFarmLogo = async ({
  adminId,
  ipAddress,
  userAgent,
}) => {
  const settings =
    await getOrCreateFarmSettings();

  const oldPublicId =
    settings.farmLogo?.publicId ||
    "";

  settings.farmLogo = {
    url: "",
    publicId: "",
  };

  await settings.save();

  if (oldPublicId) {
    try {
      await deleteCloudinaryImage(
        oldPublicId,
      );
    } catch (error) {
      console.error(
        "Farm logo deletion failed:",
        error,
      );
    }
  }

  await logSettingsActivity({
    entityType:
      "FarmSettings",

    entityId:
      settings._id,

    description:
      "Farm logo was removed.",

    metadata: {
      section: "farm",
      field: "farmLogo",
      adminId,
    },

    ipAddress,
    userAgent,
  });

  return buildFarmSettings(
    settings,
  ).farmLogo;
};

module.exports = {
  getSettings,
  getOrCreateFarmSettings,
  buildFarmSettings,
  updateFarmSettings,
  updateNotifications,
  updateFeedingSchedule,
  updateFarmLogo,
  removeFarmLogo,
};