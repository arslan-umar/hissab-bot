-- Run this in Supabase SQL Editor

CREATE TABLE expenses (
  id        BIGSERIAL PRIMARY KEY,
  phone     VARCHAR(20)     NOT NULL,
  amount    DECIMAL(12, 2)  NOT NULL,
  category  VARCHAR(50)     NOT NULL DEFAULT 'Other',
  description TEXT,
  date      DATE            NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX idx_expenses_phone ON expenses(phone);
CREATE INDEX idx_expenses_date  ON expenses(date);
