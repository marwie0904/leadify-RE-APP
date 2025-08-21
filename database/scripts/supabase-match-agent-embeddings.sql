-- SQL for match_agent_embeddings function
create or replace function match_agent_embeddings(
  agent_id_param uuid,
  query_embedding vector,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  embedding vector,
  file_name text,
  chunk_index integer,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    id,
    content,
    embedding,
    file_name,
    chunk_index,
    (embedding <#> query_embedding) as similarity
  from agent_embeddings
  where agent_id = agent_id_param
  order by embedding <#> query_embedding
  limit match_count;
end;
$$; 