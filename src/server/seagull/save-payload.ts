import type { Dashboard, CreateDashboard } from "../schemas/dashboard";

export type SaveDashboardInput = Dashboard | CreateDashboard;

/**
 * Serialize a Dashboard (with or without id) into the form-encoded body that
 * seagull expects at:
 *   POST /opmon/seagull/www/index.php/wsconnector/action/savedashboard
 *
 * The body is a single `json=<JSON string>` field. The JSON envelope carries
 * legacy AMF-binary fields (diagram, metadata, background, image, sound, svg)
 * that the HTML client cannot populate — we emit empty strings to prevent
 * server-side deserialization errors.
 *
 * The `id` field is omitted entirely for create-new drafts. The `widgets`
 * array is an extension not used by the legacy Flex client (it packs layout
 * into `diagram`). See docs/seagull-save-api.md §Implication.
 */
export function buildSaveDashboardBody(input: SaveDashboardInput): string {
  const envelope: Record<string, unknown> = {
    name: input.name,
    description: "",
    username: input.owner,
    last_revision: new Date().toLocaleString("pt-BR"),
    acl: "0",
    allmayview: "1",
    timer: "15000",
    scale: "1",
    scalestretch: "1",
    uid: "",
    width: String(input.width),
    height: String(input.height),
    widgets: input.widgets,
    diagram: "",
    metadata: "",
    background: "",
    image: "",
    sound: "",
    svg: "",
  };
  if ("id" in input && input.id) {
    envelope.id = input.id;
  }
  const params = new URLSearchParams();
  params.set("json", JSON.stringify(envelope));
  return params.toString();
}
