CREATE TABLE IF NOT EXISTS dashboards (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  owner    TEXT NOT NULL,
  created  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dashboards (name, owner) VALUES
  ('Infrastructure Overview', 'opuser'),
  ('Network Core',            'opuser')
ON CONFLICT DO NOTHING;
