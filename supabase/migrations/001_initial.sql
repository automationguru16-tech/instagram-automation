-- Keywords that trigger the automation
CREATE TABLE keywords (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword               TEXT,                          -- NULL = match any comment
  public_reply_variants TEXT[]      NOT NULL,          -- bot picks one at random
  private_opener_text   TEXT        NOT NULL,
  button_label          TEXT        NOT NULL,
  link_url              TEXT        NOT NULL,
  closing_text          TEXT        NOT NULL,
  active                BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per comment that triggered the flow (used for deduplication + stats)
CREATE TABLE processed_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id TEXT        UNIQUE NOT NULL,
  keyword_id UUID        REFERENCES keywords(id) ON DELETE SET NULL,
  sender_id  TEXT        NOT NULL,
  status     TEXT        NOT NULL CHECK (status IN ('opener_sent', 'link_sent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON processed_events (keyword_id);
CREATE INDEX ON processed_events (sender_id);
