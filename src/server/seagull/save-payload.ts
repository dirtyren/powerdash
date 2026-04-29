import type { Dashboard } from "../schemas/dashboard";

/**
 * Serialize a Dashboard into the form-encoded body seagull expects at
 *   POST /opmon/seagull/www/index.php/wsconnector/action/savedashboard
 *
 * The body is a single `json=<JSON string>` field. The JSON envelope carries
 * legacy AMF-binary fields (diagram, metadata, background, image, sound, svg)
 * that the HTML client cannot populate — we emit empty strings to prevent
 * server-side deserialization errors.
 *
 * The `widgets` array is an extension not used by the legacy Flex client
 * (it packs layout into `diagram`). See docs/seagull-save-api.md §Implication.
 */
export function buildSaveDashboardBody(dashboard: Dashboard): string {
  const envelope = {
    id: dashboard.id,
    name: dashboard.name,
    description: "",
    username: dashboard.owner,
    last_revision: new Date().toLocaleString("pt-BR"),
    acl: "0",
    allmayview: "1",
    timer: "15000",
    scale: "1",
    scalestretch: "1",
    uid: "",
    width: "1920",
    height: "1080",
    widgets: dashboard.widgets,
    diagram: "",
    metadata: "",
    background: "",
    image: "",
    sound: "",
    svg: "",
  };
  const params = new URLSearchParams();
  params.set("json", JSON.stringify(envelope));
  return params.toString();
}
