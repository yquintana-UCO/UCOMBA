create policy "authenticated can select customers"
  on customers for select
  to authenticated
  using (true);

create policy "authenticated can insert customers"
  on customers for insert
  to authenticated
  with check (true);

create policy "authenticated can update customers"
  on customers for update
  to authenticated
  using (true)
  with check (true);
