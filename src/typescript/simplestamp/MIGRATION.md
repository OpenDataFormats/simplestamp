# TypeScript Migration Plan

Migration from `src/javascript/simplestamp` → `src/typescript/simplestamp`.

---

## Current state

The scaffold at `src/typescript/simplestamp` is ready:

```
src/typescript/simplestamp/
├── index.ts                      ← public entry point (stub)
├── package.json                  ← TypeScript, ts-jest, @typescript-eslint, ts-proto
├── tsconfig.json                 ← strict mode, target ES2020, commonjs
├── .eslintrc.js                  ← @typescript-eslint/recommended
├── lib/
│   ├── parser.ts                 ← stub
│   ├── parser.test.ts            ← stub (test.todo placeholders)
│   ├── execution.ts              ← stub
│   ├── execution.test.ts         ← stub
│   ├── timestamp.ts              ← stub
│   ├── timestamp.test.ts         ← stub
│   ├── calendar.ts               ← stub
│   └── calendar.test.ts          ← stub
└── models/simplestamp/v1/        ← populated by proto:gen (see Step 1)
```

`tsc --noEmit` passes on the current stubs. After `npm install` the full
`npm test` and `npm run lint` pipeline will be live.

---

## Prerequisites

Before starting, install the toolchain once in the TypeScript package root:

```bash
cd src/typescript/simplestamp
npm install
```

For the protobuf step also install the protobuf compiler:

```bash
# macOS
brew install protobuf

# Ubuntu/Debian
apt install protobuf-compiler
```

---

## Step 1 — Generate TypeScript protobuf models

The JS package uses hand-generated `google-protobuf` (jspb) files. Replace
them with `ts-proto` output, which produces clean TypeScript interfaces and
removes the jspb runtime dependency entirely.

```bash
npm run proto:gen
```

This runs the `proto:gen` script from `package.json`:

```
protoc \
  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_proto_out=models \
  --ts_proto_opt=esModuleInterop=true,forceLong=number,outputEncodeMethods=true,outputJsonMethods=false,outputClientImpl=false \
  --proto_path=../../protobuf \
  ../../protobuf/simplestamp/v1/*.proto
```

Expected output (one file per `.proto`):

```
models/simplestamp/v1/operation.ts
models/simplestamp/v1/attestation.ts
models/simplestamp/v1/status.ts
models/simplestamp/v1/timestamp.ts
models/simplestamp/v1/identity.ts
models/simplestamp/v1/location.ts
```

These files replace the `*_pb.js` files in the JS package and **should not be
hand-edited** — they are always regenerated from the source `.proto` files.

Key difference from jspb: `ts-proto` generates plain TypeScript interfaces
rather than class instances with getter/setter methods. Where the JS code
calls `attestation.getCalendarUrl()`, the TS code will use
`attestation.calendarUrl` directly.

---

## Step 2 — Migrate `parser.ts`

**Source:** `src/javascript/simplestamp/lib/parser.js`  
**Complexity:** Low — pure functions, no class inheritance, clear data flow.

### Changes required

- Replace `require('../models/..._pb')` imports with `ts-proto` generated
  types from `../../models/simplestamp/v1/...`
- Replace jspb constructor calls (`new Operation()`, `operation.setType(n)`)
  with plain object construction: `const op: Operation = { type: n, ... }`
- Add explicit return types to all static methods:

```typescript
static parseServerResponse(binary: Buffer): Operation[]
static extractAttestationStatus(binary: Buffer): AttestationStatus
static extractVariableBytes(binary: Buffer): [Buffer, Buffer]
static extractVariableInteger(binary: Buffer): [number, Buffer]
static reverse(input: Buffer): Buffer
```

- The `/* eslint no-bitwise: 0 */` directive becomes unnecessary with
  `@typescript-eslint` (bitwise is allowed by default).

### Test migration

Copy `parser.test.js` → `parser.test.ts`. Replace:
- `require` with `import`
- `path.join(__dirname, '../../../tests/data/...')` paths stay the same
- No type assertions should be needed — the test already uses `.toBe` and
  `.toThrow` which TypeScript infers correctly.

---

## Step 3 — Migrate `execution.ts`

**Source:** `src/javascript/simplestamp/lib/execution.js`  
**Complexity:** Low–Medium — crypto operations plus protobuf manipulation.

### Changes required

- Add explicit types to all method signatures:

```typescript
static deriveCalendarKey(hash: Buffer, operations: Operation[]): Buffer
static processOperations(initial: Buffer, attestation: Attestation): Attestation
static sha256(input: Buffer): Buffer
```

- Replace jspb getters/setters with direct property access on ts-proto objects.
  Note that ts-proto objects are plain interfaces — to update them, use object
  spread: `attestation = { ...attestation, calendarUrl: url }`.
  Alternatively, keep them as mutable objects using `Partial<Attestation>` and
  `Object.assign`.
- The `switch` over `OperationType` becomes a switch over a TypeScript enum,
  which the compiler will warn about missing cases — a free exhaustiveness check.

### Test migration

Copy `execution.test.js` → `execution.test.ts`, replace `require` with
`import`. The `Buffer.from(...)` hex assertions remain unchanged.

---

## Step 4 — Migrate `timestamp.ts`

**Source:** `src/javascript/simplestamp/lib/timestamp.js`  
**Complexity:** High — largest file, most protobuf surface area, most tests.

### Changes required

- The module-level `OPERATION_TYPE_LABELS_` and `STATUS_LABELS_` dicts become
  typed `Map<OperationType, string>` and `Map<AttestationStatus, string>`:

```typescript
const OPERATION_TYPE_LABELS = new Map<OperationType, string>(
  Object.entries(OperationType)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => [v as OperationType, k])
);
```

- All jspb getters (`timestamp_.getAttestationsList()`,
  `attestation.getStatus()`, etc.) become direct property access.
- `static fromBinary(binary: Buffer): Timestamp` uses ts-proto's generated
  `Timestamp.decode(binary)` instead of `Timestamp.deserializeBinary(binary)`.
- `toBinary(): Buffer` uses `Timestamp.encode(this.timestamp_).finish()`.
- Private fields (`timestamp_`, `calendar_`, etc.) should be typed with
  TypeScript's `private` modifier. Consider replacing the `_` suffix convention
  with actual TypeScript access control.
- Add a `RequestOptions` interface for the https options object passed around
  in `Calendar`.

### Test migration

Copy `timestamp.test.js` → `timestamp.test.ts`. The binary fixture files
(`timestamp0*.bin`) are read the same way. Update any jspb-specific assertions
to use direct property access.

---

## Step 5 — Migrate `calendar.ts`

**Source:** `src/javascript/simplestamp/lib/calendar.js`  
**Complexity:** Medium — async http, Promise chains, mocked in tests.

### Changes required

- Add a `RequestOptions` interface (or import `https.RequestOptions` from
  Node's built-in types):

```typescript
import { RequestOptions } from 'https';
```

- Type the `request_` property as:

```typescript
private request_: (options: RequestOptions, payload?: Buffer) => Promise<Buffer>;
```

- `stamp(timestamp: Timestamp): Promise<number>`
- `update(timestamp: Timestamp): Promise<boolean>`
- The `jest.fn()` mocks in `calendar.test.ts` should use `jest.fn<Promise<Buffer>, []>()` for proper type inference.

### Test migration

Calendar tests use `jest.fn()` mocks returning Promises. Type these with
generics to avoid `any`:

```typescript
const requestMock = jest.fn<Promise<Buffer>, [RequestOptions, Buffer?]>(
  () => Promise.resolve(binResponse)
);
```

---

## Step 6 — Wire `index.ts` and build

Update `index.ts` to export the fully-implemented `Timestamp`:

```typescript
export { Timestamp } from './lib/timestamp';
export type { Attestation } from './models/simplestamp/v1/attestation';
export { AttestationStatus } from './models/simplestamp/v1/status';
```

Run the full pipeline to confirm everything is green:

```bash
npm run build        # tsc → dist/
npm test             # ts-jest runs all *.test.ts
npm run lint         # @typescript-eslint
```

---

## Step 7 — Update coveralls and CI

- Change the `test` script in `package.json` to pipe coverage to coveralls
  (same as the JS version) once the new package has a Coveralls token.
- Update any CI scripts that reference `src/javascript/simplestamp` to also
  run `src/typescript/simplestamp`.

---

## Migration order rationale

The order above (parser → execution → timestamp → calendar) follows the
dependency graph bottom-up. Each step can be done, tested, and merged
independently. The JS package remains the production package until Step 6 is
complete and all tests pass.

---

## Key differences to watch for

| JS (jspb)                            | TS (ts-proto)                              |
|--------------------------------------|--------------------------------------------|
| `new Operation()`                    | `{ type: 0, value: new Uint8Array() }`     |
| `op.getType()`                       | `op.type`                                  |
| `op.setType(n)`                      | `op = { ...op, type: n }`                  |
| `attestation.serializeBinary()`      | `Attestation.encode(attestation).finish()` |
| `Timestamp.deserializeBinary(buf)`   | `Timestamp.decode(buf)`                    |
| `Buffer.from(op.getValue())`         | `Buffer.from(op.value)`                    |
| `operation.setValue(Uint8Array.from)`| `op.value = new Uint8Array(...)`           |

---

## Protobuf immutability note

`ts-proto` generates plain interfaces. Since `processOperations` and
`upgradeAttestation` currently mutate an `Attestation` object in place, the TS
versions should use one of these patterns:

1. **Mutable copy** — `const mutable = { ...attestation }` then mutate.
2. **Accumulator** — build a new `Partial<Attestation>` and spread at the end.
3. **Message factory** — call `create<Attestation>()` from ts-proto helpers.

Option 1 is the closest to the current JS behaviour and least disruptive.
