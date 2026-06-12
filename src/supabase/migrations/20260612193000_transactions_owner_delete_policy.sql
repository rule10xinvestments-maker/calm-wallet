create policy "transactions_delete_own"
on public.transactions
for delete
to authenticated
using (auth.uid() = user_id);
