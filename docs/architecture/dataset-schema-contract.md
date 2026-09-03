# Dataset Schema Contract V1

Status: Canonical  
Version: 1

This document is the canonical contract for all work involving:

- `datasets`
- `dataset_records`
- Dataset CRUD
- DatasetRecord CRUD
- dynamic forms
- API validation
- import/export
- Dataset tables and filters
- dashboard Dataset consumption

It defines the finalized V1 structure. Some structural enforcement described
below is intentionally a follow-up implementation task; it does not change the
current runtime behaviour until that work is completed.

## 1. Core Model

The application uses:

- `datasets` as the definition/template of a business Dataset;
- `dataset_records` as the current REGIONAL business snapshot;
- `dataset_record_history` as immutable previous REGIONAL DatasetRecord snapshots;
- `dataset_table_records` as current TABULAR rows; and
- `dataset_table_record_history` as immutable previous TABULAR row snapshots.

Storage is mode-specific: REGIONAL Datasets use `dataset_records`; TABULAR
Datasets use `dataset_table_records`. These models are intentionally separate.

A real DatasetRecord UPDATE snapshots the previous current state before
mutation, and a DELETE snapshots it before hard deletion. History owns previous
business state; `audit_logs` retain concise actor/action metadata.

Dataset lifecycle is represented by `datasets.archivedAt`: `null` means active;
a non-null value means archived and read-only for DatasetRecord mutations.
Datasets with current records or history MUST NOT be hard-deleted; a never-used
Dataset may be hard-deleted.

One DatasetRecord represents one Dataset, one Region, one normalized period,
and one complete business payload conforming to `datasets.dataSchema`.

## 2. Dataset Ownership

Every Dataset MUST define `datasets.ownerBidangId`. It is the one canonical
owner Bidang; a Bidang may own many Datasets.

DatasetRecords do not store ownership. Ownership is resolved through:

`dataset_record.datasetId -> datasets.ownerBidangId`.

Keep these responsibilities separate:

- `datasets.ownerBidangId`: structural ownership/responsible Bidang;
- `auth_user_to_bidang`: Operator Bidang scope;
- Better Auth: capability; and
- `dataset_records`: business snapshots.

## 3. Canonical `datasets.dataSchema`

`dataSchema` defines the dynamic business fields in `dataset_records.data`.

The canonical V1 shape is:

```json
{
  "version": 1,
  "fields": [
    {
      "key": "nama",
      "label": "Nama",
      "description": "Nama komoditas",
      "type": "string",
      "required": true,
      "validation": {
        "minLength": 1,
        "maxLength": 100
      }
    }
  ]
}
```

Canonical common field properties are:

- `key`: required stable business key;
- `label`: required non-empty presentation label;
- `description`: optional string presentation/help metadata, which forms and
  other display helpers MAY use;
- `type`: required canonical field type; and
- `required`: required boolean.

A field MUST contain only properties applicable to its type. `unit` is not part
of the canonical V1 field contract and MUST NOT be used in new Dataset
definitions.

`version` remains `1`. This is a V1 hardening/extension, not a V2 redesign.

## 4. Field Key Requirements

All `dataSchema.fields[].key` values MUST be non-empty, trimmed/normalized,
and unique within `fields`. V1 does not impose a naming style: camelCase,
snake_case, and other naming styles are not rejected solely by their style.

Dataset IDs remain separate, uppercase technical identifiers such as
`IKP_TAHUNAN` and `FOOD_STOCK_DAILY`.

## 5. Canonical Field Types

New Dataset definitions MUST use only:

- `string`
- `number`
- `boolean`
- `select`
- `date`

`select` is the canonical finite-choice type. Do not add `enum`, including as
an alias.

Legacy compatibility remains important:

- `text` is a legacy string-like type;
- `textarea` is a legacy string-like type with its previous presentation
  semantics.

Legacy types remain readable by the current runtime but are not canonical for
new definitions. Unknown, new, or misspelled types MUST eventually be rejected
on Dataset-definition writes; they MUST NOT be silently normalized to
`string`. That structural enforcement is not implemented by this document.

## 6. Field-Type Semantics

### `string`

String values are persisted as JSON strings.

```json
{
  "key": "nama",
  "label": "Nama",
  "description": "Nama komoditas",
  "type": "string",
  "required": true,
  "validation": {
    "minLength": 1,
    "maxLength": 100
  }
}
```

Supported validation properties:

- `required`
- `minLength`
- `maxLength`

`minLength` and `maxLength` MUST be non-negative integers. When both exist,
`minLength` MUST be less than or equal to `maxLength`. V1 does not define
regex/pattern validation.

### `number`

Number values are persisted as JSON numbers, never numeric strings.

```json
{
  "key": "skor",
  "label": "Skor",
  "type": "number",
  "required": true,
  "validation": {
    "min": 0,
    "max": 5,
    "decimalPlaces": 2
  }
}
```

Supported validation properties:

- `required`
- `min`
- `max`
- `decimalPlaces`

`min` and `max` are numeric bounds; when both exist, `min` MUST be less than
or equal to `max`. `decimalPlaces` MUST be a non-negative integer:

- `0` means integer-only;
- `1` allows at most one fractional digit;
- `2` allows at most two fractional digits; and so on.

`decimalPlaces` describes numeric precision only. It does not specify whether
users type decimal values with `.` or `,`; locale/input formatting is a
separate UI concern. Do not use `comma`, `precision`, `step`, or `integer`
unless a later contract explicitly adds them.

### `boolean`

Boolean values are persisted as JSON booleans.

```json
{
  "key": "aktif",
  "label": "Aktif",
  "type": "boolean",
  "required": true
}
```

Only `required` is defined for V1 booleans.

### `select`

Persist only the selected option `value`; the label belongs to `dataSchema`.

```json
{
  "key": "status",
  "label": "Status",
  "type": "select",
  "required": true,
  "options": [
    { "value": "AMAN", "label": "Aman" },
    { "value": "WASPADA", "label": "Waspada" }
  ]
}
```

Each option MUST have a non-empty `value` and `label`. A canonical select MUST
have at least one option, and option values MUST be unique within its field.
Display surfaces MAY show the matching option label.

### `date`

Date values are persisted using strict `YYYY-MM-DD`.

```json
{
  "key": "tanggalPemantauan",
  "label": "Tanggal Pemantauan",
  "type": "date",
  "required": false
}
```

Only `required` is defined for V1 dates. Do not introduce `minDate` or
`maxDate` in V1.

## 7. Required and Optional Values

`required: true` means the field MUST exist and MUST NOT be empty or `null`.

`required: false` permits an empty field. The current normalization convention
is to omit optional empty fields from `dataset_records.data`; it does not
standardize them as explicit `null` values.

For example, an empty optional `keterangan` is represented as:

```json
{
  "harga": 15000
}
```

not:

```json
{
  "harga": 15000,
  "keterangan": null
}
```

## 8. Representative `dataSchema` Example

```json
{
  "version": 1,
  "fields": [
    {
      "key": "namaKomoditas",
      "label": "Nama Komoditas",
      "type": "string",
      "required": true,
      "validation": {
        "minLength": 1,
        "maxLength": 100
      }
    },
    {
      "key": "harga",
      "label": "Harga",
      "type": "number",
      "required": true,
      "validation": {
        "min": 0,
        "decimalPlaces": 0
      }
    },
    {
      "key": "tersedia",
      "label": "Tersedia",
      "type": "boolean",
      "required": true
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "required": true,
      "options": [
        { "value": "AMAN", "label": "Aman" },
        { "value": "WASPADA", "label": "Waspada" }
      ]
    },
    {
      "key": "tanggalPemantauan",
      "label": "Tanggal Pemantauan",
      "type": "date",
      "required": false
    }
  ]
}
```

## 9. `dataset_records.data`

`dataset_records.data` MUST be a flat JSON object containing business data
only. Its keys MUST conform to declared `dataSchema.fields[].key` values.
Undeclared business-data keys are invalid and MUST be rejected by the future
hardening validator.

Do not put relational/contextual metadata in the JSON payload:

- `datasetId`
- `regionId`
- `periodDate` or period
- `ownerBidangId`
- `status`
- audit/user metadata
- authorization data

The current runtime may silently drop undeclared keys. That is an implementation
gap, not an alternative contract; rejection belongs to the upcoming
structural/value-validation hardening.

## 10. Canonical `datasets.dataConfig`

`dataConfig` defines Dataset-level record-context behaviour. It does not define
dynamic business payload fields.

The canonical V1 shape is:

```json
{
  "version": 1,
  "mode": "REGIONAL",
  "periodicity": "BULANAN",
  "regionLevel": "KECAMATAN",
  "startPeriod": "2025-01-01",
  "endPeriod": "2025-12-01",
  "source": "Dinas Ketahanan Pangan Kabupaten Sumbawa Barat",
  "interpretation": "Catatan singkat mengenai cara membaca Dataset."
}
```

Canonical properties:

- `version`
- `mode`: exactly `REGIONAL` or `TABULAR` for canonical writes;
- `periodicity`
- `startPeriod`
- optional `endPeriod`
- optional `source`: human-readable provenance for the Dataset;
- optional `interpretation`: short human-readable context for understanding the Dataset.

When present, `source` and `interpretation` MUST be trimmed non-empty strings.
Whitespace-only values are omitted from normalized config. They are optional for
legacy Dataset definitions and do not affect DatasetRecord payload, validation,
or behavior.

Allowed `periodicity` values:

- `HARIAN`
- `BULANAN`
- `TRIWULANAN`
- `TAHUNAN`

`startPeriod` is required for canonical V1 Dataset writes. It MUST be a strict
valid `YYYY-MM-DD` date and already be the first normalized period for the
selected periodicity. It is the earliest period allowed for DatasetRecords.

`endPeriod` is optional. When supplied, it MUST be a strict valid `YYYY-MM-DD`
date, already be the first normalized period for the selected periodicity, and
be greater than or equal to `startPeriod`. An explicit `endPeriod` defines a
fixed upper coverage bound and may be in the future. When omitted, coverage is
rolling through the current normalized period, so `startPeriod` MUST NOT be
after that current period.

REGIONAL config requires `regionLevel`. Allowed values are:

- `KABUPATEN`
- `KECAMATAN`
- `DESA`

TABULAR config does not allow `regionLevel`, Region rows, or Region completeness
denominators. `useRegion` is not part of canonical config. Older stored configs
without `mode` are read as REGIONAL for compatibility, but all canonical writes
must serialize an explicit mode.

Do not store dashboard layout, chart colors, widget positions, UI styling, or
other presentation configuration in `dataConfig`.

## 11. `dataSchema` and `dataConfig` Boundary

`dataSchema` defines the dynamic business payload, for example:

- score
- price
- status
- description
- measurement value

`dataConfig` defines Dataset-level record context, currently:

- periodicity; and
- required Region level for REGIONAL mode only; and
- temporal coverage starting at `startPeriod` and ending at optional
  `endPeriod`, or at the current normalized period when `endPeriod` is omitted;
- optional source provenance; and
- optional interpretation context.

Neither JSON document owns Dataset identity, Region identity, period identity,
owner Bidang, authorization, or DatasetRecord uniqueness. The relational
business identity remains:

`datasetId + regionId + normalized periodDate`.

## 12. Periodicity

Both `dataset_records.periodDate` and `dataset_table_records.periodDate` store
one normalized SQL `DATE`.

- `HARIAN`: actual selected date;
- `BULANAN`: first day of the month;
- `TRIWULANAN`: first day of the quarter; and
- `TAHUNAN`: first day of the year.

DatasetRecord mutations MUST remain within the temporal range from the
Dataset's normalized `startPeriod` through its effective normalized end:
explicit `endPeriod` when present, otherwise the current normalized period.
The current date does not truncate an explicit fixed range, which may extend
into the future. Temporal coverage does not classify data as actual,
projection, target, or any other semantic type. These concerns remain
separate. `startPeriod` is a lower bound only; it does not change DatasetRecord
identity or group Regions. It can later support period selectors, bulk/matrix
entry, import context/template generation, and data completeness/coverage
calculations. Those features are outside V1's current implementation.

Do not introduce `periodStart` or `periodEnd` for standard DatasetRecords.
Dataset IDs may continue using stable English technical identifiers even though
`dataConfig.periodicity` uses Indonesian values.

## 13. Region Contract

`regions` is the canonical Region master. `regions.id` stores the Kemendagri
region identifier, for example `52.07`, `52.07.02`, or `52.07.02.2001`.

For REGIONAL mode, `dataConfig.regionLevel` defines the level valid for
DatasetRecord creation. DatasetRecords MUST reference the canonical Region
through `regionId`; they do not duplicate Region name/code inside `data`.
TABULAR DatasetTableRecords have no Region relation or Region fields.

## 14. Dataset Record Identity and Uniqueness

REGIONAL identity is:

`datasetId + regionId + periodDate`

The database enforces `UNIQUE(datasetId, regionId, periodDate)`. One record is
one complete Dataset snapshot for that Region and normalized period.

TABULAR identity is `DatasetTableRecord.id`. A Dataset may have any number of
TABULAR rows in the same normalized period; there is intentionally no unique
constraint on `datasetId + periodDate`. TABULAR rows never contain `regionId`.
TABULAR history keeps `sourceRecordId` as a scalar rather than a foreign key,
so snapshots remain after a source row is hard-deleted.

## 15. Authorization

DatasetRecord authorization remains Better Auth capability plus Dataset owner
Bidang scope. `datasets.ownerBidangId` is the authoritative structural owner;
Admin and Super Admin have global Bidang scope according to the existing
authorization helpers.

An Operator may act only when its role has the required `businessData`
capability and it is assigned to the Dataset owner Bidang. Cross-Bidang
delegated DatasetRecord access is not supported.

Do not store authorization in `dataSchema`, `dataConfig`, or
`dataset_records.data`.

## 16. Structural and Value Validation Roadmap

The finalized contract requires future Dataset-definition write validation to
remain tolerant enough to preserve readable historical/current definitions,
while becoming strict for canonical new definitions.

The future structural validator MUST reject:

- duplicate field keys;
- missing/empty `key` or `label`;
- unsupported field types;
- validation properties not allowed for the field type;
- `min > max`;
- `minLength > maxLength`;
- negative or non-integer `decimalPlaces`;
- select fields without valid options;
- duplicate select option values;
- invalid periodicity or region level; and
- unknown structural properties where the canonical contract disallows them.

DatasetRecord value validation MUST reject undeclared business-data keys and
apply the declared type rules. This roadmap is normative, but the structural
validator and corresponding runtime hardening are deliberately not implemented
by this documentation change.

Frontend validation is UX only; server-side validation remains authoritative.

## 17. Dynamic Forms, Import, and Export

DatasetRecord forms MUST be generated from `dataSchema`; operators must not
edit raw JSON to enter records.

Canonical form mapping is `string` to text input, `number` to numeric input,
`boolean` to switch/checkbox, `select` to its configured options, and `date`
to a date input. Legacy `text` and `textarea` retain their current presentation
compatibility until a future implementation change explicitly retires it.

Imports map business columns to `dataSchema.fields[].key` and one source row to
one complete DatasetRecord snapshot. Import validation MUST use the same
DatasetRecord contract as manual entry; do not create a separate import model.
Dataset ownership comes from `datasets.ownerBidangId`, not a business import
column.

Exports SHOULD use field `label` values as headings while retaining canonical
`key` values internally.

## 18. Versioning and Schema Mutation Safety

Both `dataSchema` and `dataConfig` use `version: 1`. Do not silently change V1
semantics. A genuinely incompatible future change requires an explicit
versioning decision.

Changing `dataSchema` can affect historical records. Adding an optional field
is generally safe. Renaming/removing a used key, changing a type, or making a
previously optional field required can break historical data.

Do not automatically rewrite historical DatasetRecord data. Treat field keys
as stable persisted data-contract keys once records exist.

## 19. Architectural Boundary and Source of Truth

Relational columns own identity, Region, ownership, authorization, period,
status, and audit/user metadata. JSON owns dynamic business payload only.

Do not introduce parallel Dataset architectures or business-master tables
unless explicitly requested. This document is the single source of truth for
Dataset schema/config structure and behaviour. If a future requirement
conflicts with it, identify the conflict and intentionally extend or version
the contract rather than silently inventing a different structure.
