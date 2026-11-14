insert into public.consents (id, purpose, granted)
values
  ('document-analysis', 'Decode an uploaded policy or loan document and generate citations', true),
  ('document-chat', 'Answer questions using only the uploaded document', true),
  ('document-act', 'Prepare a payment request or reminder; never execute without approval', true)
on conflict (id) do update set granted = excluded.granted, updated_at = now();
