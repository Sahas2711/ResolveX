-- Migration: Add UPDATE to TimelineEventType enum
-- Adds the 'UPDATE' event type for complaint edit/update timeline events

ALTER TYPE "timeline_event_type" ADD VALUE 'UPDATE';
