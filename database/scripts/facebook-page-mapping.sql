-- Table to store Facebook Page <-> Agent mappings
create table if not exists facebook_page_agents (
  id uuid primary key default uuid_generate_v4(),
  agent_id uuid not null,
  page_id text not null,
  page_access_token text not null,
  created_at timestamp with time zone default now()
);

create unique index if not exists idx_facebook_page_agents_agent_page on facebook_page_agents(agent_id, page_id); 