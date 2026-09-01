# Dataset Schema Contract V1

Status: Canonical  
Version: 1

This document is the canonical contract for all future work involving:

- `datasets`
- `dataset_records`
- dataset CRUD
- dataset record CRUD
- dynamic forms
- API validation
- import/export
- dataset tables
- dataset filters
- dashboard dataset consumption

## 1. Core Model

The application uses:

- `datasets` as the definition/template of a business dataset.
- `dataset_records` as the current canonical data snapshot produced from a dataset definition.
- `dataset_record_history` as immutable previous DatasetRecord snapshots.

Relationship:

`datasets` 1:N `dataset_records`

DatasetRecord history is retained separately. A real UPDATE snapshots the old
current state before mutation, and a DELETE snapshots the old current state
before hard deletion. History survives deletion of the current row; it is not
a version-number system and it does not replace `audit_logs`. History owns
previous business state, while audit logs retain concise actor/action metadata.

Dataset lifecycle is represented by `datasets.archivedAt`: `null` means active
and a non-null value means archived. Archiving retains Dataset definitions,
records, and history, but prevents DatasetRecord create/update/delete. Datasets
with current records or history cannot be hard-deleted; a never-used Dataset
may still be hard-deleted.

One `dataset_record` represents:

- one dataset;
- one region;
- one normalized period; and
- one complete business payload matching `datasets.dataSchema`.

Example:

- `datasetId = FOOD_STOCK_DAILY`
- `regionId = 52.07.02`
- `periodDate = 2026-08-10`

`data`:

```json
{
  "beras": 5000,
  "jagung": 2100,
  "padi": 3200
}
```

Do not model every commodity or individual field as a separate dataset record.

A dataset record represents the complete snapshot defined by the dataset schema for one region and one period.

## 2. Dataset Ownership

Every dataset must define:

`datasets.ownerBidangId`

`datasets.ownerBidangId` is required for every dataset.

A dataset has exactly one canonical owner bidang.

A bidang may own many datasets.

Relationship:

`auth_bidang` 1:N `datasets`

Dataset records do not store ownership directly.

Ownership is inherited through:

`dataset_record.datasetId`  
`-> datasets.id`  
`-> datasets.ownerBidangId`

Keep this distinction strict:

- `datasets.ownerBidangId` = structural ownership / responsible bidang
- `auth_user_to_bidang` = Operator Bidang scope for owner DatasetRecord access
- Better Auth = capability / allowed actions
- `dataset_records` = actual business snapshots

Owner DatasetRecord access is authorized by matching `datasets.ownerBidangId`
against the authenticated Operator's assigned Bidang plus the required Better
Auth capability. Admin and Super Admin have global Bidang scope.

Do not introduce multiple dataset owners.

Do not add `ownerBidangId` back to `dataset_records`.

## 3. `datasets.dataSchema`

`dataSchema` defines what business data fields exist in a dataset.

Canonical V1 structure:

```json
{
  "version": 1,
  "fields": [
    {
      "key": "value",
      "label": "Nilai",
      "type": "number",
      "unit": "indeks",
      "required": false
    }
  ]
}
```

Canonical field properties:

- `key`: required
- `label`: required
- `type`: required
- `required`: required boolean
- `unit`: optional
- `description`: optional
- `options`: required when `type = "select"` and otherwise not needed

Do not allow a `select` field without valid options.

Do not invent arbitrary properties without intentionally extending or versioning this contract.

## 4. Field Key Convention

All `dataSchema.fields[].key` values must use camelCase.

Valid examples:

- `value`
- `beras`
- `cabaiRawit`
- `luasPanen`
- `pphKetersediaan`
- `jumlahRumahTanggaRentan`

Do not use mixed naming styles such as:

- `cabai_rawit`
- `CabaiRawit`
- `CABAI_RAWIT`
- `cabai-rawit`

Dataset IDs use a different convention and must remain uppercase technical identifiers, for example:

- `IKP_YEARLY`
- `PPH_CONSUMPTION_YEARLY`
- `PPH_AVAILABILITY_YEARLY`
- `FOOD_STOCK_DAILY`
- `FOOD_PRODUCTION_MONTHLY`

Do not mix dataset ID conventions with field key conventions.

## 5. Supported Field Types

Dataset Schema Contract V1 supports only:

- `number`
- `text`
- `textarea`
- `select`
- `boolean`
- `date`

Do not introduce:

- `object`
- `array`
- `group`
- `matrix`
- `relation`
- nested schema types

unless the contract is explicitly extended or versioned.

### `number`

Schema example:

```json
{
  "key": "value",
  "label": "Indeks Ketahanan Pangan",
  "type": "number",
  "unit": "indeks",
  "required": false
}
```

Persist actual JSON numbers:

```json
{
  "value": 80.4
}
```

Do not persist numeric values as strings such as:

```json
{
  "value": "80.4"
}
```

### `text`

Schema values must be persisted as JSON strings.

Example:

```json
{
  "keterangan": "Kondisi aman"
}
```

### `textarea`

The persisted representation is also a JSON string.

`textarea` differs from `text` only in frontend presentation.

### `select`

Schema example:

```json
{
  "key": "status",
  "label": "Status",
  "type": "select",
  "required": false,
  "options": [
    {
      "value": "AMAN",
      "label": "Aman"
    },
    {
      "value": "WASPADA",
      "label": "Waspada"
    },
    {
      "value": "RAWAN",
      "label": "Rawan"
    }
  ]
}
```

Persist only the selected option value:

```json
{
  "status": "AMAN"
}
```

Do not persist duplicated option objects such as:

```json
{
  "status": {
    "value": "AMAN",
    "label": "Aman"
  }
}
```

The label belongs to `dataSchema`.

### `boolean`

Persist actual JSON booleans:

```json
{
  "terverifikasi": true
}
```

### `date`

Persist date values using the canonical format `YYYY-MM-DD`.

Example:

```json
{
  "tanggalPublikasi": "2026-08-10"
}
```

## 6. Required and Null Behavior

`required: true` means:

- the field must exist; and
- the field must not be `null`.

`required: false` means:

- the field may contain `null`.

For optional schema-defined fields, prefer preserving the key with a `null` value rather than omitting the key.

Preferred:

```json
{
  "ikp": 80.4,
  "catatan": null
}
```

This keeps forms, dynamic tables, exports, validation, and chart processing predictable.

This remains preferred normalization behavior rather than a reason to redesign historical payloads.

## 7. `dataset_records.data`

`dataset_records.data` must be a flat JSON object.

It must:

- be a JSON object;
- contain business data only;
- use keys that correspond exactly to `datasets.dataSchema.fields[].key`; and
- not contain unknown fields.

Example schema field keys:

- `beras`
- `jagung`
- `cabaiRawit`

Valid record payload:

```json
{
  "beras": 5000,
  "jagung": 2100,
  "cabaiRawit": 24
}
```

Do not duplicate relational metadata inside `data`.

The following values belong only in relational columns:

- `datasetId`
- `regionId`
- `periodDate`
- `status`
- `createdBy`
- `createdAt`
- `updatedAt`

Dataset ownership also remains outside JSON and is resolved from:

`datasets.ownerBidangId`

Do not put `ownerBidangId` inside `dataset_records.data`.

Invalid example:

```json
{
  "regionId": "52.07",
  "periodDate": "2026-01-01",
  "createdBy": "user-id",
  "value": 80.4
}
```

Correct:

- `dataset_records.datasetId = IKP_YEARLY`
- `dataset_records.regionId = 52.07`
- `dataset_records.periodDate = 2026-01-01`

`dataset_records.data`:

```json
{
  "value": 80.4
}
```

The JSON payload contains business data only.

## 8. Unknown Fields

Server-side validation must reject fields that are not declared in `dataSchema`.

If the schema contains only:

- `value`
- `catatan`

then this payload must be rejected:

```json
{
  "value": 80,
  "catatan": null,
  "randomField": "abc"
}
```

Do not silently persist unknown fields.

## 9. `datasets.dataConfig`

`dataConfig` defines how the dataset behaves in the application.

Canonical Dataset Schema Contract V1 structure:

```json
{
  "version": 1,
  "periodicity": "TAHUNAN",
  "useRegion": true,
  "regionLevel": "KABUPATEN"
}
```

Canonical properties:

- `version`
- `periodicity`
- `useRegion`
- `regionLevel`

`dataSchema` and `dataConfig` have strictly separate responsibilities:

- `dataSchema` = what data exists
- `dataConfig` = how the dataset behaves

Do not store dashboard presentation configuration in `dataConfig`.

Do not place things such as:

- chart colors
- widget size
- widget position
- dashboard layout
- UI styling

inside Dataset Schema Contract V1 `dataConfig`.

## 10. Periodicity

Canonical V1 periodicity values:

- `HARIAN`
- `MINGGUAN`
- `BULANAN`
- `TRIWULANAN`
- `TAHUNAN`

Do not use English periodicity enum values in `dataConfig`.

`dataset_records.periodDate` stores one normalized SQL `DATE`.

Normalization rules:

- `HARIAN`: use the actual selected date.
- `MINGGUAN`: use the canonical start date of the week according to the application's weekly convention.
- `BULANAN`: use the first day of the month.
- `TRIWULANAN`: use the first day of the quarter.
- `TAHUNAN`: use the first day of the year.

Examples:

- `10 August 2026 -> 2026-08-10`
- `August 2026 -> 2026-08-01`
- `Q3 2026 -> 2026-07-01`
- `2026 -> 2026-01-01`

Dataset IDs may still use stable English technical identifiers such as:

- `IKP_YEARLY`
- `FOOD_STOCK_DAILY`

Do not rename existing dataset IDs merely because `dataConfig.periodicity` uses Indonesian values.

Do not introduce `periodStart` or `periodEnd` for standard dataset records.

## 11. Region Contract

The application uses the canonical `regions` table.

`regions.id` directly stores the Kemendagri region identifier.

Examples:

- `52.07`
- `52.07.02`
- `52.07.02.2001`

Canonical V1 region levels:

- `KABUPATEN`
- `KECAMATAN`
- `DESA`

Do not change `DESA` to `DESA_KELURAHAN`.

`dataConfig.regionLevel` defines the region level allowed for dataset record creation.

Example:

```json
{
  "version": 1,
  "periodicity": "HARIAN",
  "useRegion": true,
  "regionLevel": "KECAMATAN"
}
```

This means the dataset record must reference a region whose level is `KECAMATAN`.

`dataset_records.regionId` references the canonical region.

Do not duplicate region names or region codes inside `dataset_records.data`.

Use only `dataset_records.regionId`.

For Dataset Schema Contract V1, currently supported operational datasets are region-based and therefore use:

```json
{
  "useRegion": true
}
```

This keeps V1 consistent with:

- required dataset record region context;
- `dataset_records.regionId`; and
- `UNIQUE(datasetId, regionId, periodDate)`.

Do not design `useRegion: false` semantics as part of V1.

If a future requirement genuinely needs a non-regional dataset, treat that as an intentional contract extension or versioning decision rather than silently allowing nullable or placeholder regions.

## 12. Dataset Record Identity and Uniqueness

The canonical business identity of a dataset record is:

`datasetId + regionId + periodDate`

The database must enforce:

`UNIQUE(datasetId, regionId, periodDate)`

Do not include `ownerBidangId` in this constraint.

There must never be two independent snapshots for the same dataset, region, and normalized period.

If the snapshot already exists, edit or update the existing record instead of creating another record.

One dataset record continues to represent:

- one dataset;
- one region;
- one normalized period; and
- one complete business payload conforming to `dataSchema`.

## 13. Authorization

DatasetRecord authorization uses the existing application architecture:

`user.role`  
`-> auth_user_to_bidang`  
`-> auth_bidang`  
`-> datasets`  
`-> dataset_records`

For DatasetRecord operations, Better Auth answers what the user may do and
`datasets.ownerBidangId` answers where the operation may happen.

An Operator may act on DatasetRecords only when:

- their Better Auth role has the required `businessData` capability; and
- they are assigned to the Dataset's `ownerBidangId`.

Admin and Super Admin keep global Bidang scope. Cross-Bidang delegated
DatasetRecord access is not supported.

Keep these concepts separate:

- Better Auth = global role or access
- `auth_user_to_bidang` = user bidang assignment
- `datasets.ownerBidangId` = canonical structural owner of the dataset
- owner match + Better Auth capability = DatasetRecord authorization
- `dataset_records` = business snapshots only and do not store ownership directly

Do not store authorization inside:

- `datasets.dataSchema`
- `datasets.dataConfig`
- `dataset_records.data`

Do not create a second RBAC system.

## 14. Server Validation Contract

When creating or updating `dataset_records`, server-side code must:

1. authenticate the request using the existing Better Auth implementation;
2. load the referenced dataset;
3. resolve `datasets.ownerBidangId` as the canonical dataset owner;
4. read `dataset.dataSchema`;
5. validate submitted data against all declared fields;
6. reject unknown fields;
7. enforce `required`;
8. enforce declared field types;
9. enforce valid `select.options`;
10. allow `null` only when `required = false`;
11. persist actual JSON values, not serialized JSON strings;
12. read `dataset.dataConfig`;
13. validate and normalize `periodDate` according to periodicity;
14. validate `regionId` and `regionLevel`;
15. enforce `UNIQUE(datasetId, regionId, periodDate)`;
16. enforce Better Auth capability and Dataset owner Bidang scope; and
17. derive `createdBy` from the authenticated user instead of trusting client input.

Frontend validation is UX only and must never replace server-side validation.

Server-side validation remains authoritative.

## 15. Dynamic Form Contract

Dataset record forms must be generated from `dataSchema`.

Canonical mapping:

- `number` -> numeric input
- `text` -> text input
- `textarea` -> textarea
- `select` -> select using `options`
- `boolean` -> checkbox or switch
- `date` -> date picker or date input

Operators must not be required to manually edit raw JSON when entering dataset records.

## 16. Import Contract

Import logic must use the same Dataset Schema Contract V1.

One imported tabular row represents:

- one complete dataset snapshot;
- for one region; and
- for one period.

Business columns map to `dataSchema.fields[].key`.

Example spreadsheet for `FOOD_STOCK_DAILY`:

```text
Tanggal | Kecamatan | Beras | Jagung | Padi
2026-08-10 | Taliwang | 5000 | 2100 | 3200
2026-08-10 | Maluk    | 1200 | 800  | 950
2026-08-11 | Taliwang | 4980 | 2150 | 3180
```

Each row becomes one `dataset_record`.

Imported values must pass the exact same validation as manually entered records.

Do not implement separate validation rules specifically for imports.

Do not create a separate import data model.

Do not include dataset owner as a business import column.

Dataset owner comes from:

`datasets.ownerBidangId`

## 17. Export Contract

Exports should derive business columns from `dataSchema`.

Use human-readable `label` values for exported column headers while retaining canonical `key` values internally.

Do not export the business payload as one unreadable raw JSON column unless explicitly requested.

If useful, owner information may appear once in export metadata or header, but not as duplicated per-row business data.

## 18. Versioning

Both `dataSchema` and `dataConfig` must contain:

```json
{
  "version": 1
}
```

Dataset Schema Contract V1 is the current canonical format.

Do not silently change V1 semantics.

If future requirements require incompatible structures, introduce a new explicit contract version rather than mutating the meaning of V1.

## 19. Schema Mutation Safety

Changing `datasets.dataSchema` may affect historical `dataset_records`.

Examples of generally safe changes:

- adding a new optional field

Examples of potentially breaking changes:

- renaming an existing field key
- removing a used field
- changing a field type
- changing an optional field to required after historical records already exist

Do not automatically rewrite historical dataset records or perform breaking schema migrations unless explicitly requested.

Treat `dataSchema.fields[].key` as a stable persisted data contract once records exist.

## 20. Architectural Boundary

Keep the following distinction strict.

Relational database columns are responsible for:

- identity
- authentication
- authorization
- region
- ownership
- period
- status
- audit or user metadata

JSON is responsible for:

- dynamic business payload

Do not introduce business master tables such as:

- commodities
- units
- markets
- institutions
- `data_sources`
- indicators

unless explicitly requested by the project owner.

## 21. Source of Truth for Future Agents

This `Dataset Schema Contract V1` document must be treated as the source of truth for future work involving:

- `datasets`
- `dataset_records`
- dataset CRUD
- dataset record CRUD
- dynamic forms
- API validation
- import/export
- dataset tables
- dataset filters
- dashboard dataset consumption

If a future requirement conflicts with Dataset Schema Contract V1:

- do not silently invent a different data structure;
- explicitly identify the conflict; and
- only extend or version the contract when the requirement genuinely requires it.
