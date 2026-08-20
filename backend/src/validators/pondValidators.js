const { body, param, query } = require("express-validator");

const objectIdValidation = (fieldName) =>
param(fieldName)
.isMongoId()
.withMessage(`${fieldName} must be a valid ID.`);

const pondNameValidation = body("name")
.trim()
.notEmpty()
.withMessage("Pond name is required.")
.isLength({ max: 100 })
.withMessage("Pond name cannot exceed 100 characters.");

const pondNumberValidation = body("pondNumber")
.trim()
.notEmpty()
.withMessage("Pond number is required.")
.isLength({ max: 50 })
.withMessage("Pond number cannot exceed 50 characters.");

const pondTypeValidation = body("pondType")
.isIn([
"concrete",
"earthen",
"tarpaulin",
"plastic",
"fiberglass",
"other"
])
.withMessage("Invalid pond type.");

const pondSizeValueValidation = body("pondSize.value")
.isFloat({ min: 0 })
.withMessage("Pond size must be zero or greater.")
.toFloat();

const pondSizeUnitValidation = body("pondSize.unit")
.optional()
.isIn([
"sqm",
"m2",
"liters",
"cubic_meters"
])
.withMessage("Invalid pond size unit.");

const waterSourceValidation = body("waterSource")
.optional()
.isIn([
"borehole",
"well",
"river",
"rainwater",
"municipal",
"other"
])
.withMessage("Invalid water source.");

const statusValidation = body("status")
.optional()
.isIn([
"active",
"empty",
"maintenance",
"inactive"
])
.withMessage("Invalid pond status.");

const notesValidation = body("notes")
.optional({ nullable: true })
.trim()
.isLength({ max: 2000 })
.withMessage("Notes cannot exceed 2,000 characters.");

const createPondValidators = [
pondNameValidation,
pondNumberValidation,
pondTypeValidation,
pondSizeValueValidation,
pondSizeUnitValidation,
waterSourceValidation,
statusValidation,
notesValidation
];

const updatePondValidators = [
objectIdValidation("id"),

body("name")
.optional()
.trim()
.notEmpty()
.withMessage("Pond name cannot be empty.")
.isLength({ max: 100 })
.withMessage("Pond name cannot exceed 100 characters."),

body("pondNumber")
.optional()
.trim()
.notEmpty()
.withMessage("Pond number cannot be empty.")
.isLength({ max: 50 })
.withMessage("Pond number cannot exceed 50 characters."),

body("pondType")
.optional()
.isIn([
"concrete",
"earthen",
"tarpaulin",
"plastic",
"fiberglass",
"other"
])
.withMessage("Invalid pond type."),

body("pondSize.value")
.optional()
.isFloat({ min: 0 })
.withMessage("Pond size must be zero or greater.")
.toFloat(),

body("pondSize.unit")
.optional()
.isIn([
"sqm",
"m2",
"liters",
"cubic_meters"
])
.withMessage("Invalid pond size unit."),

body("waterSource")
.optional()
.isIn([
"borehole",
"well",
"river",
"rainwater",
"municipal",
"other"
])
.withMessage("Invalid water source."),

statusValidation,
notesValidation
];

const pondIdValidators = [
objectIdValidation("id")
];

const listPondValidators = [
query("status")
.optional()
.isIn([
"active",
"empty",
"maintenance",
"inactive"
])
.withMessage("Invalid pond status."),

query("search")
.optional()
.trim()
.isLength({ max: 100 })
.withMessage("Search term cannot exceed 100 characters."),

query("page")
.optional()
.isInt({ min: 1 })
.withMessage("Page must be at least 1.")
.toInt(),

query("limit")
.optional()
.isInt({ min: 1, max: 100 })
.withMessage("Limit must be between 1 and 100.")
.toInt()
];

module.exports = {
createPondValidators,
updatePondValidators,
pondIdValidators,
listPondValidators
};
