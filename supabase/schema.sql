-- جدول بيانات الطالبات مع الحماية والدوال الآمنة
-- نفّذ هذا الملف في SQL Editor داخل مشروع Supabase

create extension if not exists "pgcrypto";

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  identity_number text not null unique,
  name text not null,
  tasks text,
  activities text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- تحديث updated_at تلقائياً
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

-- تفعيل RLS ومنع الوصول العام
alter table public.students enable row level security;

-- لا سياسة قراءة عامة: الزوار لا يستطيعون قراءة الجدول مباشرة
-- يسمح فقط للمستخدم المصادق عليه (المشرف) بالقراءة الكاملة
drop policy if exists "admin full access" on public.students;
create policy "admin full access"
on public.students
for all
to authenticated
using (true)
with check (true);

-- دالة آمنة للبحث برقم الهوية ترجع سجل الطالبة المطابقة فقط
create or replace function public.get_student_by_identity(p_identity text)
returns table (
  identity_number text,
  name text,
  tasks text,
  activities text,
  notes text
)
language sql
security definer
set search_path = public
as $$
  select s.identity_number, s.name, s.tasks, s.activities, s.notes
  from public.students s
  where s.identity_number = p_identity
  limit 1;
$$;

-- السماح للمجهول باستدعاء الدالة فقط، دون منح قراءة الجدول
revoke all on public.students from anon;
grant execute on function public.get_student_by_identity(text) to anon;
grant execute on function public.get_student_by_identity(text) to authenticated;
