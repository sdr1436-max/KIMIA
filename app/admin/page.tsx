"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabaseClient";

type Student = {
  id: string;
  identity_number: string;
  name: string;
  tasks: string | null;
  activities: string | null;
  notes: string | null;
};

const emptyForm = { identity_number: "", name: "", tasks: "", activities: "", notes: "" };

function normalizeDigits(input: string) {
  return input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim();
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/admin/login");
      } else {
        setReady(true);
        loadStudents();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStudents() {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.from("students").select("*").order("created_at", { ascending: false });
    setStudents(data ?? []);
  }

  function showMessage(text: string, type: "success" | "error") {
    setMessage(text);
    setMessageType(type);
  }

  function validate() {
    if (!normalizeDigits(form.identity_number)) {
      showMessage("رقم الهوية حقل إلزامي", "error");
      return false;
    }
    if (!form.name.trim()) {
      showMessage("الاسم حقل إلزامي", "error");
      return false;
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    const supabase = createBrowserSupabase();
    const payload = {
      identity_number: normalizeDigits(form.identity_number),
      name: form.name.trim(),
      tasks: form.tasks,
      activities: form.activities,
      notes: form.notes,
    };
    const existing = students.find((s) => s.identity_number === payload.identity_number && s.id !== editingId);
    if (existing && !editingId) {
      showMessage("رقم الهوية موجود مسبقاً في سجل آخر، يمكنك فتح السجل لتعديله", "error");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("students").insert(payload);
    if (error) {
      showMessage(error.code === "23505" ? "رقم الهوية موجود مسبقاً، يمكنك فتح السجل لتعديله" : "تعذر حفظ البيانات، حاولي مرة أخرى", "error");
    } else {
      showMessage("تم حفظ بيانات الطالبة بنجاح", "success");
      setForm(emptyForm);
      await loadStudents();
    }
    setLoading(false);
  }

  async function handleUpdate() {
    if (!editingId) {
      showMessage("اختاري سجلاً من الجدول لتعديله أولاً", "error");
      return;
    }
    if (!validate()) return;
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase
      .from("students")
      .update({
        identity_number: normalizeDigits(form.identity_number),
        name: form.name.trim(),
        tasks: form.tasks,
        activities: form.activities,
        notes: form.notes,
      })
      .eq("id", editingId);
    if (error) {
      showMessage(error.code === "23505" ? "رقم الهوية موجود في سجل آخر" : "تعذر تعديل البيانات", "error");
    } else {
      showMessage("تم تحديث البيانات بنجاح", "success");
      setForm(emptyForm);
      setEditingId(null);
      await loadStudents();
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!editingId) {
      showMessage("اختاري سجلاً من الجدول لحذفه", "error");
      return;
    }
    if (!window.confirm("هل أنت متأكدة من حذف هذا السجل؟ لا يمكن التراجع عن الحذف.")) return;
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("students").delete().eq("id", editingId);
    if (error) {
      showMessage("تعذر حذف السجل", "error");
    } else {
      showMessage("تم حذف السجل بنجاح", "success");
      setForm(emptyForm);
      setEditingId(null);
      await loadStudents();
    }
    setLoading(false);
  }

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.replace("/");
  }

  function openRecord(s: Student) {
    setForm({
      identity_number: s.identity_number,
      name: s.name,
      tasks: s.tasks ?? "",
      activities: s.activities ?? "",
      notes: s.notes ?? "",
    });
    setEditingId(s.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtered = students.filter((s) => {
    const q = normalizeDigits(tableSearch);
    return !q || s.identity_number.includes(q);
  });

  if (!ready) {
    return <main className="min-h-screen flex items-center justify-center">جارٍ التحقق من الصلاحيات...</main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-teal-800">لوحة تحكم المشرف</h1>
        <button onClick={handleLogout} className="border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-100">
          تسجيل الخروج
        </button>
      </div>

      <section className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">{editingId ? "تعديل بيانات الطالبة" : "إضافة بيانات طالبة"}</h2>
        <div className="grid gap-4">
          <input placeholder="رقم الهوية *" value={form.identity_number} onChange={(e) => setForm({ ...form, identity_number: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-3" />
          <input placeholder="الاسم *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-3" />
          <textarea placeholder="المهام" rows={3} value={form.tasks} onChange={(e) => setForm({ ...form, tasks: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-3" />
          <textarea placeholder="الأنشطة" rows={3} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-3" />
          <textarea placeholder="ملاحظات" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-slate-300 px-4 py-3" />
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={handleSave} disabled={loading} className="bg-teal-600 text-white rounded-lg px-6 py-2 disabled:opacity-60">حفظ البيانات</button>
          <button onClick={handleUpdate} disabled={loading} className="bg-blue-600 text-white rounded-lg px-6 py-2 disabled:opacity-60">تعديل البيانات</button>
          <button onClick={handleDelete} disabled={loading} className="bg-red-600 text-white rounded-lg px-6 py-2 disabled:opacity-60">حذف البيانات</button>
          <button onClick={() => { setForm(emptyForm); setEditingId(null); }} className="border border-slate-300 rounded-lg px-6 py-2">تفريغ الحقول</button>
        </div>
        {message && <p className={`mt-4 font-medium ${messageType === "success" ? "text-green-600" : "text-red-600"}`}>{message}</p>}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">السجلات</h2>
        <input
          placeholder="ابحث برقم الهوية..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="w-full mb-4 rounded-lg border border-slate-300 px-4 py-3"
        />
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-right">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3">رقم الهوية</th>
                <th className="p-3">الاسم</th>
                <th className="p-3">المهام</th>
                <th className="p-3">الأنشطة</th>
                <th className="p-3">ملاحظات</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3">{s.identity_number}</td>
                  <td className="p-3">{s.name}</td>
                  <td className="p-3 whitespace-pre-wrap">{s.tasks}</td>
                  <td className="p-3 whitespace-pre-wrap">{s.activities}</td>
                  <td className="p-3 whitespace-pre-wrap">{s.notes}</td>
                  <td className="p-3">
                    <button onClick={() => openRecord(s)} className="text-blue-600 hover:underline">فتح</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">لا توجد سجلات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
