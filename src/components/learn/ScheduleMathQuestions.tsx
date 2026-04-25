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

const operations = [
  { key: "+", label: "➕", calc: (a: number, b: number) => a + b },
  { key: "−", label: "➖", calc: (a: number, b: number) => a - b },
  { key: "×", label: "✖️", calc: (a: number, b: number) => a * b },
  { key: "÷", label: "➗", calc: (a: number, b: number) => Math.floor(a / b) },
];

export default function ScheduleMathQuestions({ kids }: Props) {
  const t = useTranslations("learn");
  const tCommon = useTranslations("common");
  const [selectedKid, setSelectedKid] = useState(kids[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split("T")[0];
  });
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingIds, setExistingIds] = useState<string[]>([]);

  // Quick-add state
  const [quickOp, setQuickOp] = useState("+");
  const [quickA, setQuickA] = useState("");
  const [quickB, setQuickB] = useState("");

  const fetchExisting = useCallback(async () => {
    if (!selectedKid || !selectedDate) return;
    setLoading(true);
    setError(null);
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
        setRows([]);
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

  // Quick-add: compute and add a standard arithmetic question
  const handleQuickAdd = () => {
    const a = parseInt(quickA);
    const b = parseInt(quickB);
    if (isNaN(a) || isNaN(b)) return;
    if (rows.length >= 10) return;

    // Validate division
    if (quickOp === "÷" && b === 0) return;

    const op = operations.find((o) => o.key === quickOp)!;
    const ans = op.calc(a, b);
    const questionText = `${a} ${quickOp} ${b}`;

    setRows([...rows, { question: questionText, answer: String(ans) }]);
    setQuickA("");
    setQuickB("");
  };

  // Manual free-form add
  const addEmptyRow = () => {
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
      // Atomic replace: delete old + create new in one server transaction
      const questions = validRows.map((r) => ({
        question: r.question.trim(),
        answer: parseInt(r.answer),
        questionType: "custom",
      }));

      const res = await fetch("/api/math/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kidId: selectedKid,
          scheduledDate: selectedDate,
          questions,
        }),
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
      const params = new URLSearchParams({
        kidId: selectedKid,
        scheduledDate: selectedDate,
      });
      await fetch(`/api/math/questions?${params}`, { method: "DELETE" });
      setRows([]);
      setExistingIds([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const selectedKidName = kids.find((k) => k.id === selectedKid)?.name || t("unnamed");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          Learning Center
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
          {t("scheduleQuestions")}
        </h1>
        <p className="text-pg-muted mt-2">{t("scheduleQuestionsDesc")}</p>
      </div>

      {/* Date and Kid selectors */}
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-pg-ink mb-2">
              📅 {t("selectDate")}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent text-lg"
            />
          </div>
          {kids.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-pg-ink mb-2">
                👦 {t("selectKid")}
              </label>
              <select
                value={selectedKid}
                onChange={(e) => setSelectedKid(e.target.value)}
                className="w-full px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent text-lg"
              >
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name || t("unnamed")}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Helper */}
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <h3 className="text-lg font-medium text-pg-ink mb-4">
          ⚡ {t("quickAdd")}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="number"
            inputMode="numeric"
            value={quickA}
            onChange={(e) => setQuickA(e.target.value)}
            placeholder="3"
            className="w-20 px-3 py-3 border border-pg-line rounded-lg text-center text-2xl font-bold focus:outline-none focus:border-pg-accent"
          />
          <div className="flex gap-1">
            {operations.map((op) => (
              <button
                key={op.key}
                type="button"
                onClick={() => setQuickOp(op.key)}
                className={`w-12 h-12 rounded-[10px] text-xl font-bold transition ${
                  quickOp === op.key
                    ? "text-white"
                    : "bg-pg-cream text-pg-ink hover:bg-[rgba(68,55,32,0.1)]"
                }`}
                style={
                  quickOp === op.key
                    ? { background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }
                    : undefined
                }
              >
                {op.key}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={quickB}
            onChange={(e) => setQuickB(e.target.value)}
            placeholder="5"
            className="w-20 px-3 py-3 border border-pg-line rounded-lg text-center text-2xl font-bold focus:outline-none focus:border-pg-accent"
          />
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!quickA || !quickB || rows.length >= 10}
            className="px-5 py-3 text-white font-semibold rounded-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition-transform hover:scale-[1.01] text-base"
            style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
          >
            {t("addQuestion")}
          </button>
        </div>
        {/* Preview */}
        {quickA && quickB && !isNaN(parseInt(quickA)) && !isNaN(parseInt(quickB)) &&
          !(quickOp === "÷" && parseInt(quickB) === 0) && (
          <div className="mt-3 text-pg-muted text-sm">
            {t("preview")}: {quickA} {quickOp} {quickB} ={" "}
            {operations.find((o) => o.key === quickOp)!.calc(parseInt(quickA), parseInt(quickB))}
          </div>
        )}
      </div>

      {/* Question list */}
      {loading ? (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-pg-cream rounded"></div>
            <div className="h-10 bg-pg-cream rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-pg-ink">
              📝 {t("questionList")} ({rows.length}/10)
            </h3>
            <button
              type="button"
              onClick={addEmptyRow}
              disabled={rows.length >= 10}
              className="text-pg-accent-deep hover:underline text-sm font-semibold disabled:opacity-40"
            >
              + {t("addFreeForm")}
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-8 text-pg-muted">
              <span className="text-4xl block mb-2">📭</span>
              <p>{t("noQuestionsYet")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <span className="text-sm font-bold text-pg-muted w-6 text-center">{i + 1}</span>
                  <input
                    type="text"
                    value={row.question}
                    onChange={(e) => updateRow(i, "question", e.target.value)}
                    placeholder={t("questionPlaceholder")}
                    className="flex-1 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent text-lg"
                  />
                  <span className="text-pg-muted font-bold">=</span>
                  <input
                    type="number"
                    value={row.answer}
                    onChange={(e) => updateRow(i, "answer", e.target.value)}
                    placeholder="?"
                    className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent text-lg text-center font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="text-pg-muted hover:text-pg-coral transition p-1"
                    title={tCommon("delete")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {rows.length >= 10 && (
            <p className="text-sm text-[#a87a3c] mt-3">⚠️ {t("maxQuestionsReached")}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.25)] text-pg-coral rounded-[10px] p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Actions */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 text-white font-semibold rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.01] text-base"
            style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
          >
            {saving ? t("savingQuestions") : `💾 ${t("saveQuestions")}`}
          </button>
          {existingIds.length > 0 && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="px-6 py-3 bg-white border border-pg-line text-pg-ink font-semibold rounded-[10px] hover:bg-pg-cream disabled:opacity-50 transition"
            >
              🗑️ {t("clearDay")}
            </button>
          )}
          {saved && (
            <span className="text-pg-accent-deep font-semibold text-base">✅ {t("questionsScheduled")}</span>
          )}
        </div>
      )}

      {/* Info box for grandma */}
      <div className="bg-[rgba(127,168,221,0.1)] border border-[rgba(127,168,221,0.3)] rounded-[12px] p-5 text-[#4a6a8a] text-sm">
        <p className="font-medium mb-1">💡 {t("howItWorks")}</p>
        <p>{t("howItWorksDesc", { name: selectedKidName })}</p>
      </div>
    </div>
  );
}
