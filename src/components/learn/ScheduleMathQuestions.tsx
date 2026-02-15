"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Kid = {
  id: string;
  name: string | null;
};

type QuestionRow = {
  id?: string;
  question: string;
  answer: string;
};

type Props = {
  kids: Kid[];
};

export default function ScheduleMathQuestions({ kids }: Props) {
  const t = useTranslations("learn");
  const tCommon = useTranslations("common");
  const [selectedKid, setSelectedKid] = useState(kids[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [rows, setRows] = useState<QuestionRow[]>([{ question: "", answer: "" }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingIds, setExistingIds] = useState<string[]>([]);

  const fetchExisting = useCallback(async () => {
    if (!selectedKid || !selectedDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kidId: selectedKid,
        scheduledDate: selectedDate,
        activeOnly: "true",
      });
      const res = await fetch(`/api/math/questions?${params}`);
      const data = await res.json();
      if (data.questions?.length > 0) {
        setRows(
          data.questions.map((q: { id: string; question: string; answer: number }) => ({
            id: q.id,
            question: q.question,
            answer: String(q.answer),
          }))
        );
        setExistingIds(data.questions.map((q: { id: string }) => q.id));
      } else {
        setRows([{ question: "", answer: "" }]);
        setExistingIds([]);
      }
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [selectedKid, selectedDate, tCommon]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows([...rows, { question: "", answer: "" }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "question" | "answer", value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);

    const validRows = rows.filter((r) => r.question.trim() && r.answer.trim());
    if (validRows.length === 0) {
      setError(t("addAtLeastOne"));
      return;
    }

    for (const r of validRows) {
      if (isNaN(parseInt(r.answer))) {
        setError(t("answersNumbers"));
        return;
      }
    }

    setSaving(true);

    try {
      // Delete existing questions for this date+kid
      for (const id of existingIds) {
        await fetch(`/api/math/questions/${id}`, { method: "DELETE" });
      }

      // Create new questions
      const questions = validRows.map((r, i) => ({
        question: r.question.trim(),
        answer: parseInt(r.answer),
        questionType: "custom",
        scheduledDate: selectedDate,
        kidId: selectedKid,
        sortOrder: i,
      }));

      const res = await fetch("/api/math/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questions),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await fetchExisting();
      } else {
        const data = await res.json();
        setError(data.error || tCommon("somethingWentWrong"));
      }
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      for (const id of existingIds) {
        await fetch(`/api/math/questions/${id}`, { method: "DELETE" });
      }
      setRows([{ question: "", answer: "" }]);
      setExistingIds([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t("scheduleQuestions")}</h2>
        <p className="text-gray-600 mt-1">{t("scheduleQuestionsDesc")}</p>
      </div>

      {/* Date and Kid selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectDate")}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectKid")}
            </label>
            <select
              value={selectedKid}
              onChange={(e) => setSelectedKid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name || t("unnamed")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Question rows */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-6">{i + 1}.</span>
              <input
                type="text"
                value={row.question}
                onChange={(e) => updateRow(i, "question", e.target.value)}
                placeholder={t("questionPlaceholder")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                value={row.answer}
                onChange={(e) => updateRow(i, "answer", e.target.value)}
                placeholder={t("expectedAnswer")}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {rows.length < 10 && (
            <button
              type="button"
              onClick={addRow}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t("addQuestion")}
            </button>
          )}

          {rows.length >= 10 && (
            <p className="text-sm text-gray-500">{t("maxQuestionsReached")}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? t("savingQuestions") : t("saveQuestions")}
        </button>
        {existingIds.length > 0 && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
          >
            {t("clearDay")}
          </button>
        )}
        {saved && (
          <span className="text-green-600 font-medium">✓ {t("questionsScheduled")}</span>
        )}
      </div>
    </div>
  );
}
