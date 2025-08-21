-- Migration script to add missing columns to leads table and create notifications table
-- Run this in your Supabase SQL editor

-- Add agent_id to leads if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'agent_id') THEN
        ALTER TABLE leads ADD COLUMN agent_id UUID;
    END IF;
END $$;

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type TEXT NOT NULL, -- e.g., 'assignment', 'system', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- URL to view the conversation/lead
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add timeline_readable column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'timeline_readable') THEN
        ALTER TABLE leads ADD COLUMN timeline_readable TEXT;
    END IF;
    
    -- Add authority_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'authority_details') THEN
        ALTER TABLE leads ADD COLUMN authority_details TEXT;
    END IF;
    
    -- Add need_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'need_details') THEN
        ALTER TABLE leads ADD COLUMN need_details TEXT;
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('timeline_readable', 'authority_details', 'need_details')
ORDER BY column_name; 

-- Migration: Add 'notified' column to leads table to prevent duplicate notifications
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE; 

-- Add 'source' column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('website', 'facebook')); 