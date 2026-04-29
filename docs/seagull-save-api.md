# Seagull Dashboard Save API (discovery notes, 2026-04-29)

## Status: PARTIAL — endpoint and response confirmed from source; body fields confirmed but not all are relevant to the new HTML dashboard

## Endpoint

- **Method:** POST
- **Path:** `/opmon/seagull/www/index.php/wsconnector/action/savedashboard`
- **Content-Type of request:** `application/x-www-form-urlencoded`

> **Alternative path (non-opmon connector mode):**
> `/ana/?action=savedashboard&module=davinci`
>
> The Flex client switches between these based on its `CONNECTOR` config variable.
> Production OpMon instances use the `/opmon/seagull/...` form.

## Request body shape (example)

Form-encoded with a single field `json` whose value is a JSON string:

```
json=%7B%22id%22%3A%223523%22%2C%22name%22%3A%22My+Dashboard%22%2C...%7D
```

Decoded value of `json`:

```json
{
  "id": "3523",
  "name": "My Dashboard",
  "description": "Dashboard description",
  "username": "opuser",
  "last_revision": "29/04/2026 14:30",
  "acl": "0",
  "allmayview": "1",
  "timer": "15000",
  "scale": "1",
  "scalestretch": "1",
  "uid": "5f063e423bf800d535062f39c84eb04246849b05b163e8469c29185e4e47acf6",
  "sound": "<base64-encoded AMF serialized sound settings>",
  "diagram": "<base64-encoded AMF serialized XML diagram>",
  "metadata": "<base64-encoded AMF serialized metadata map>",
  "background": "<base64-encoded AMF serialized background settings>",
  "image": "<base64-encoded AMF serialized PNG preview>",
  "svg": "",
  "width": "1920",
  "height": "1080"
}
```

**Critical note for P2.1:** The legacy `diagram` and `metadata` fields are AMF-serialized
(ActionScript Binary Format) base64-encoded blobs containing the old Flex drawing canvas state.
The new HTML dashboard does not use these fields. The fields relevant to the P2.1 widget
reorder/resize/remove use case are: `id`, `name`, `description`, `username`, `acl`,
`allmayview`, `timer`, `scale`, `scalestretch`, `uid`, `last_revision`, `width`, `height`
plus the widget layout data (which the legacy client packs into `diagram`/`metadata`).

**The new HTML client will need to decide how to pass widget layout.** Options:
1. Wrap layout as JSON inside the `json` field (matching existing envelope shape)
2. Use a new/separate field if the seagull backend allows extension

## Response body shape (example)

Success:

```json
{"output": 3523}
```

Error:

```json
{"output": -2}
```

The `output` field contains:
- `> 0` — the saved/assigned dashboard `id` (integer)
- `0` or `< 0` — error code:
  - `-1` — generic save error
  - `-2` — duplicate name (dashboard name already exists)
  - `-3` — license limit exceeded
  - `-4` — user does not have permission to save

**The response does NOT echo the full dashboard object.** It returns only the integer ID.
After a successful save the Flex client re-loads the dashboard by calling `getsaveddashboard`
with the returned ID.

## Notes / gotchas

- **No echo on success** — the client must reload via `GET getsaveddashboard?id=<returnId>` after
  a successful save to get the updated dashboard object.
- **No 409 / concurrency control** — there is no optimistic locking. The server returns `-2`
  only if the *name* is a duplicate, not if a concurrent save happened. Last write wins.
- **No HTTP-level error codes for business errors** — error cases return HTTP 200 with a
  negative integer in `output`, not HTTP 4xx/5xx.
- **AMF blobs are opaque to the new client** — `diagram`, `metadata`, `background`, `image`,
  `sound` fields are AMF-serialized binary data base64-encoded by the Flex client. The HTML
  client cannot produce these without a compatibility shim or a new backend endpoint.
- **`id` field in the JSON body** — on initial save `id` is absent/null and the server assigns
  a new ID; on update `id` is included (the existing dashboard's integer id). The `update`
  boolean flag in `saveDashboard(update:Boolean)` only controls the post-save success message
  shown to the user; the server appears to use the presence of `id` in the JSON to decide
  create vs update.
- **`uid` field** — a SHA-256 hash of `name + diagram.did`. Used as a public share identifier.
  The HTML client should generate this on save.
- **`mod` param** — `makeWSRequest` appends `mod=<appName>` to every POST vars object as a
  side-channel. The server likely ignores unknown extras.
- **Required fields** — `name` is validated server-side; `-2` is returned for duplicates.
  All other fields appear optional (they have defaults in the Flex client).

## Implication for P2.1 HTML client

The P2.1 plan needs to store widget layout (grid positions, sizes, removed widgets) as part of
a dashboard save. The legacy server was never designed for a JSON widget-grid model. Downstream
tasks (T2–T13) should adopt this **assumed extension**:

```
POST /opmon/seagull/www/index.php/wsconnector/action/savedashboard
Content-Type: application/x-www-form-urlencoded

json={"id":"1","name":"Infrastructure Overview","description":"","username":"opuser",
      "acl":"0","allmayview":"1","timer":"15000","scale":"1","scalestretch":"1",
      "uid":"<sha256>","last_revision":"29/04/2026 14:30","width":"1920","height":"1080",
      "widgets":[
        {"id":"w-cpu-kpi","kind":"kpi","title":"CPU %","x":0,"y":0,"w":3,"h":2},
        {"id":"w-mem-bar","kind":"bar","title":"Memory","x":3,"y":0,"w":6,"h":4}
      ],
      "diagram":"","metadata":"","background":"","image":"","sound":"","svg":""}
```

The `widgets` array is a **new field** not present in the legacy client. The server will likely
store it as an opaque blob in the `dashboards` EAV table (key `widgets`) or ignore it — this
must be confirmed against a live dev instance. The empty strings for `diagram`/`metadata`/etc.
prevent server-side deserialization errors on fields the HTML client cannot populate.

**Assumed response (same as confirmed legacy shape):**

```json
{"output": 1}
```

## Source

- `flex/src/org/opmon/main.as:1189–1198` — `saveDashboard()` function, shows URL key
  `'savedashboard'`, `postVars = {json: JSONLite.serialize(dashboarddata)}`, calls
  `OpFlexLib.makeWSRequest`
- `flex/src/org/opmon/main.as:1046–1173` — `saveDashboardData()` — full list of all fields
  packed into the JSON body
- `flex/src/org/opmon/main.as:1247–1316` — `saveDashboardFeedback()` — response parsing,
  shows `o.output` is the returned integer id; error codes -1 through -4
- `flex/src/org/opmon/main_ext.as:3960–3978` — `getWebserviceURL('savedashboard')` resolves to
  `/opmon/seagull/www/index.php/wsconnector/action/savedashboard` (opmon connector mode)
  or `/ana/?action=savedashboard&module=davinci` (davinci/ana mode)
- `flex/src/org/opmon/OpFlexLib.as:179–275` — `makeWSRequest()` — confirms `method = "POST"`,
  `resultFormat = "text"`, `con.send(vars)` (form-encoded), response parsed as JSON via
  `JSONLite.deserialize`
- `flex/src/testbed/testsavedashboard.mxml` — integration test; shows commented production URL
  `/opmon/seagull/www/index.php/wsconnector/action/savedashboard` and example JSON body
- PDF `docs/legacy/Documentacao API Integracao OpMon Dashboards.pdf` — covers **only** the
  external data (customhandler) integration API; does **not** document the dashboard save
  endpoint at all.
