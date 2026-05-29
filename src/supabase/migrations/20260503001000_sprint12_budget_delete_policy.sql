create policy "budgets_delete_own"
on public.budgets
for delete
to authenticated
using (auth.uid() = user_id);
