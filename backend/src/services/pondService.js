const mongoose = require("mongoose");

const Pond = require("../models/Pond");
const Stocking = require("../models/Stocking");
const GrowthRecord = require("../models/GrowthRecord");
const Mortality = require("../models/Mortality");
const FeedingRecord = require("../models/FeedingRecord");
const WaterManagement = require("../models/WaterManagement");
const Sale = require("../models/Sale");
const ActivityLog = require("../models/ActivityLog");

const normalizePondData = (data) => {
const result = {};

if (data.name !== undefined) {
result.name = data.name;
}

if (data.pondNumber !== undefined) {
result.pondNumber = data.pondNumber;
}

if (data.pondType !== undefined) {
result.pondType = data.pondType;
}

if (data.pondSize !== undefined) {
result.pondSize = {
...(data.pondSize.value !== undefined && {
value: data.pondSize.value
}),
...(data.pondSize.unit !== undefined && {
unit: data.pondSize.unit
})
};
}

if (data.waterSource !== undefined) {
result.waterSource = data.waterSource;
}

if (data.status !== undefined) {
result.status = data.status;
}

if (data.notes !== undefined) {
result.notes = data.notes;
}

return result;
};

const createPond = async ({
data,
ipAddress,
userAgent
}) => {
const pondData = normalizePondData(data);

const duplicateName = await Pond.findOne({
name: pondData.name
});

if (duplicateName) {
return {
success: false,
reason: "POND_NAME_EXISTS"
};
}

const duplicateNumber = await Pond.findOne({
pondNumber: pondData.pondNumber
});

if (duplicateNumber) {
return {
success: false,
reason: "POND_NUMBER_EXISTS"
};
}

const pond = await Pond.create({
...pondData,
currentFishCount: 0,
currentAverageWeight: 0,
stockingDate: null
});

await ActivityLog.create({
action: "create",
entityType: "Pond",
entityId: pond._id,
description: `Pond "${pond.name}" was created.`,
metadata: {
pondNumber: pond.pondNumber
},
ipAddress: ipAddress || "",
userAgent: userAgent || ""
});

return {
success: true,
pond
};
};

const listPonds = async ({
page = 1,
limit = 20,
search = "",
status
}) => {
const currentPage = Math.max(
Number(page) || 1,
1
);

const pageSize = Math.min(
Math.max(Number(limit) || 20, 1),
100
);

const filter = {};

if (status) {
filter.status = status;
}

if (search) {
const escapedSearch = search.replace(
/[.*+?^${}()|[]\]/g,
"\$&"
);


const searchRegex = new RegExp(
  escapedSearch,
  "i"
);

filter.$or = [
  { name: searchRegex },
  { pondNumber: searchRegex },
  { pondType: searchRegex },
  { waterSource: searchRegex }
];


}

const [ponds, total] = await Promise.all([
Pond.find(filter)
.sort({
pondNumber: 1,
name: 1
})
.skip(
(currentPage - 1) * pageSize
)
.limit(pageSize)
.lean(),


Pond.countDocuments(filter)


]);

return {
ponds,
pagination: {
page: currentPage,
limit: pageSize,
total,
pages: Math.ceil(
total / pageSize
)
}
};
};

const getPondById = async (pondId) => {
if (!mongoose.isValidObjectId(pondId)) {
return null;
}

return Pond.findById(pondId).lean();
};

const updatePond = async ({
pondId,
data,
ipAddress,
userAgent
}) => {
if (!mongoose.isValidObjectId(pondId)) {
return {
success: false,
reason: "POND_NOT_FOUND"
};
}

const pond = await Pond.findById(pondId);

if (!pond) {
return {
success: false,
reason: "POND_NOT_FOUND"
};
}

const updateData =
normalizePondData(data);

if (updateData.name) {
const duplicateName =
await Pond.findOne({
_id: {
$ne: pond._id
},
name: updateData.name
});


if (duplicateName) {
  return {
    success: false,
    reason: "POND_NAME_EXISTS"
  };
}


}

if (updateData.pondNumber) {
const duplicateNumber =
await Pond.findOne({
_id: {
$ne: pond._id
},
pondNumber:
updateData.pondNumber
});

if (duplicateNumber) {
  return {
    success: false,
    reason: "POND_NUMBER_EXISTS"
  };
}

}

if (updateData.pondSize) {
updateData.pondSize = {
value:
updateData.pondSize.value !== undefined
? updateData.pondSize.value
: pond.pondSize.value,

  unit:
    updateData.pondSize.unit !== undefined
      ? updateData.pondSize.unit
      : pond.pondSize.unit
};

}

Object.assign(
pond,
updateData
);

await pond.save();

await ActivityLog.create({
action: "update",
entityType: "Pond",
entityId: pond._id,
description:
`Pond "${pond.name}" was updated.`,
metadata: updateData,
ipAddress:
ipAddress || "",
userAgent:
userAgent || ""
});

return {
success: true,
pond
};
};

const deletePond = async ({
pondId,
ipAddress,
userAgent
}) => {
if (!mongoose.isValidObjectId(pondId)) {
return {
success: false,
reason: "POND_NOT_FOUND"
};
}

const pond =
await Pond.findById(pondId);

if (!pond) {
return {
success: false,
reason: "POND_NOT_FOUND"
};
}

const [
stockingCount,
growthCount,
mortalityCount,
feedingCount,
waterCount,
salesCount
] = await Promise.all([
Stocking.countDocuments({
pond: pond._id
}),


GrowthRecord.countDocuments({
  pond: pond._id
}),

Mortality.countDocuments({
  pond: pond._id
}),

FeedingRecord.countDocuments({
  pond: pond._id
}),

WaterManagement.countDocuments({
  pond: pond._id
}),

Sale.countDocuments({
  pond: pond._id
})


]);

const relatedRecords =
stockingCount +
growthCount +
mortalityCount +
feedingCount +
waterCount +
salesCount;

if (relatedRecords > 0) {
return {
success: false,
reason: "POND_HAS_HISTORY",
relatedRecords
};
}

await Pond.deleteOne({
_id: pond._id
});

await ActivityLog.create({
action: "delete",
entityType: "Pond",
entityId: pond._id,
description:
`Pond "${pond.name}" was deleted.`,
metadata: {
pondNumber:
pond.pondNumber
},
ipAddress:
ipAddress || "",
userAgent:
userAgent || ""
});

return {
success: true
};
};

module.exports = {
createPond,
listPonds,
getPondById,
updatePond,
deletePond
};
