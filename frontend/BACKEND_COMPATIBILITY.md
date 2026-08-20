# Backend compatibility audit — supplied `src`

The frontend was built against the supplied backend route/controller/service contracts. The backend was also syntax-checked before packaging.

## Important findings to fix before production

### 1. Settings avatar/email controller mismatch
`controllers/settingsController.js` calls `authService.updateAvatar()` and `authService.changeEmail()`, but the supplied `services/authService.js` does not export those functions.

The frontend intentionally disables the avatar action instead of pretending it works. Email-change UI is not exposed until the backend method is repaired.

### 2. Daily activity route is mounted twice
`app.js` mounts `/api/daily-activities` twice. This does not change the frontend contract, but the duplicate mount should be removed for cleanliness.

### 3. Stocking activity log naming inconsistency
`services/stockingService.js` uses `pond.pondName` in the activity-log description while the Pond model uses `name`. This affects the audit description, not the stocking transaction itself.

### 4. Mortality synchronization deserves review
`services/mortalityService.js` calculates available fish as total stocked minus mortality, while sales also reduce `Pond.currentFishCount`. Recalculating mortality can therefore overwrite a count that has already been reduced by sales. Review the stock model before relying on recalculation after mixed sales/mortality histories.

### 5. Analytics/report survival formulas differ
The report service calculates surviving fish as `stocked - mortality - fish sold`, while analytics production currently calculates `stocked - mortality`. The frontend displays the backend result as-is, so analytics and reports can disagree until the backend formula is unified.

## Frontend compatibility decisions

- API root defaults to `http://localhost:5000/api`.
- Every protected request sends `Authorization: Bearer <accessToken>`.
- Dates are presented using Africa/Lagos formatting.
- NGN is the default currency.
- Inventory quantity changes use the dedicated stock-in, stock-out and adjustment endpoints rather than PATCH quantity.
- Feeding sends the feed brand/name so the backend can match a feed inventory item and deduct stock.
- Sales use the backend's quantity × average-weight × price-per-kg calculation and never recompute pond stock independently.
- Public website content comes from `/api/public/*` and farm settings.
- Gallery uploads use the backend's multipart `image` field and respect the 5 MB image limit.
