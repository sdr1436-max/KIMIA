"use client";

import Link from "next/link";
import { useState } from "react";

type StudentResult = {
  identity_number: string;
  name: string;
  tasks: string | null;
  activities: string | null;
  notes: string | null;
};

export default function HomePage() {
  const [identity, setIdentity] = useState("");
  const [result, setResult] = useState<StudentResult | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const value = identity.trim();
    if (!value) {
      setResult(null);
      setMessage("");
      setSearched(false);
      return;
    }
    setLoading(true);
    setMessage("");
    setResult(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/search?identity=${encodeURIComponent(value)}`);
      if (res.status === 429) {
        setMessage("محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى");
        return;
      }
      if (!res.ok) {
        setMessage("حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً");
        return;
      }
      const data = await res.json();
      if (data.student) {
        setResult(data.student);
      } else {
        setMessage("لا توجد بيانات مطابقة لرقم الهوية المدخل");
      }
    } catch {
      setMessage("تعذر الاتصال، يرجى التحقق من الإنترنت والمحاولة مجدداً");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-bold text-teal-700">بوابة بيانات الطالبات</span>
        <Link href="/admin/login" className="text-sm border border-teal-600 text-teal-700 rounded-lg px-4 py-2 hover:bg-teal-50 transition">
          دخول المشرف
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        <h1 className="text-3xl md:text-4xl font-bold text-teal-800 mb-2">بوابة بيانات الطالبات</h1>
        <p className="text-lg text-slate-600 mb-8">ابحث عن اسم الطالبة</p>

        <form onSubmit={handleSearch} className="w-full max-w-2xl flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="أدخلي رقم الهوية للبحث عن بيانات الطالبة"
            className="flex-1 rounded-xl border border-slate-300 px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span>🔍</span>
            {loading ? "جارٍ البحث..." : "بحث"}
          </button>
        </form>

        {message && <p className="mt-6 text-red-600 font-medium">{message}</p>}

        {result && (
          <div className="mt-8 w-full max-w-2xl bg-white rounded-2xl shadow-md border border-slate-200 p-6">
            <dl className="space-y-4">
              <Field label="رقم الهوية" value={result.identity_number} />
              <Field label="الاسم" value={result.name} />
              <Field label="المهام" value={result.tasks || "—"} />
              <Field label="الأنشطة" value={result.activities || "—"} />
              <Field label="الملاحظات" value={result.notes || "—"} />
            </dl>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500 mb-1">{label}</dt>
      <dd className="text-lg font-medium whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
