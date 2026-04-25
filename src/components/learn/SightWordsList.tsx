"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import SightWordForm from "./SightWordForm";

type SightWord = {
  id: string;
  word: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
};

export default function SightWordsList() {
  const [sightWords, setSightWords] = useState<SightWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<SightWord | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const t = useTranslations("sightWords");
  const tCommon = useTranslations("common");

  const handleBackfillImages = async () => {
    const missing = sightWords.filter((w) => !w.imageUrl && w.isActive);
    if (missing.length === 0) return;

    setBackfillProgress({ current: 0, total: missing.length });
    let updated = [...sightWords];
    let succeeded = 0;
    const failures: { word: string; reason: string }[] = [];

    for (let i = 0; i < missing.length; i++) {
      const word = missing[i];
      try {
        const res = await fetch(`/api/sight-words/${word.id}/generate-image`, {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          updated = updated.map((w) => (w.id === word.id ? data.sightWord : w));
          setSightWords(updated);
          succeeded++;
        } else {
          const body = await res.text();
          failures.push({ word: word.word, reason: `${res.status}: ${body.slice(0, 200)}` });
        }
      } catch (err) {
        failures.push({
          word: word.word,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
      setBackfillProgress({ current: i + 1, total: missing.length });
    }

    setBackfillProgress(null);

    if (failures.length === 0) {
      alert(`Done — generated ${succeeded} images.`);
    } else {
      console.error("Backfill failures:", failures);
      alert(
        `Generated ${succeeded} images. ${failures.length} failed. First error:\n\n${failures[0].word}: ${failures[0].reason}\n\n(See browser console for the full list.)`
      );
    }
  };

  const handleImportPack = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/sight-words/import-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: "dolch-k" }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to import pack");
        return;
      }
      if (data.imported === 0) {
        alert(t("importNothingNew"));
      } else {
        alert(
          t("importSuccess", {
            count: data.imported,
            skipped: data.skipped,
          })
        );
        fetchSightWords();
      }
    } catch (error) {
      console.error("Failed to import pack:", error);
      alert("Failed to import pack");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchSightWords();
  }, []);

  const fetchSightWords = async () => {
    try {
      const response = await fetch("/api/sight-words");
      const data = await response.json();
      if (response.ok) {
        setSightWords(data.sightWords);
      }
    } catch (error) {
      console.error("Failed to fetch sight words:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const response = await fetch(`/api/sight-words/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSightWords(sightWords.filter((w) => w.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete word");
      }
    } catch (error) {
      console.error("Failed to delete word:", error);
      alert("Failed to delete word");
    }
  };

  const handleToggleActive = async (word: SightWord) => {
    try {
      const response = await fetch(`/api/sight-words/${word.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !word.isActive }),
      });

      if (response.ok) {
        const data = await response.json();
        setSightWords(
          sightWords.map((w) => (w.id === word.id ? data.sightWord : w))
        );
      }
    } catch (error) {
      console.error("Failed to toggle word status:", error);
    }
  };

  const handleEdit = (word: SightWord) => {
    setEditingWord(word);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingWord(null);
  };

  const handleFormSuccess = (word: SightWord) => {
    if (editingWord) {
      setSightWords(sightWords.map((w) => (w.id === word.id ? word : w)));
    } else {
      setSightWords([...sightWords, word]);
    }
    handleFormClose();
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newWords = [...sightWords];
    const [draggedItem] = newWords.splice(draggedIndex, 1);
    newWords.splice(index, 0, draggedItem);
    setSightWords(newWords);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    // Save the new order
    try {
      const wordIds = sightWords.map((w) => w.id);
      await fetch("/api/sight-words/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds }),
      });
    } catch (error) {
      console.error("Failed to reorder words:", error);
      // Refetch to get correct order
      fetchSightWords();
    }

    setDraggedIndex(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-pg-muted">{tCommon("loading")}</div>;
  }

  const primaryBtn: React.CSSProperties = {
    background: "#4a6a32",
    boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
  };
  const secondaryBtn =
    "px-4 py-2 rounded-[10px] bg-white border border-pg-line text-pg-ink text-sm font-semibold hover:bg-pg-cream disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="mb-6 flex justify-end items-center flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {sightWords.some((w) => !w.imageUrl && w.isActive) && (
            <button
              onClick={handleBackfillImages}
              disabled={backfillProgress !== null}
              className={secondaryBtn}
            >
              {backfillProgress
                ? t("backfillingImages", {
                    current: backfillProgress.current,
                    total: backfillProgress.total,
                  })
                : t("backfillImages", {
                    count: sightWords.filter((w) => !w.imageUrl && w.isActive)
                      .length,
                  })}
            </button>
          )}
          <button
            onClick={handleImportPack}
            disabled={importing}
            className={secondaryBtn}
          >
            {importing ? t("importing") : t("importKPack")}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-[10px] text-white text-sm font-semibold disabled:opacity-50 transition-transform hover:scale-[1.01]"
            style={primaryBtn}
          >
            {t("addWord")}
          </button>
        </div>
      </div>

      {sightWords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[14px] border border-pg-line">
          <span className="text-6xl mb-4 block">📚</span>
          <p className="text-pg-muted">{t("noWordsYet")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-pg-muted mb-4">{t("dragToReorder")}</p>
          <div className="space-y-2">
            {sightWords.map((word, index) => (
              <div
                key={word.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-[14px] border border-pg-line p-4 flex items-center cursor-move hover:bg-pg-cream transition-colors ${
                  draggedIndex === index ? "opacity-50" : ""
                } ${!word.isActive ? "opacity-60" : ""}`}
              >
                <div className="mr-3 text-pg-muted">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                  </svg>
                </div>

                <div className="w-8 h-8 rounded-full bg-[rgba(107,142,78,0.15)] text-pg-accent-deep flex items-center justify-center font-bold mr-4">
                  {index + 1}
                </div>

                {word.imageUrl ? (
                  <img
                    src={word.imageUrl}
                    alt={word.word}
                    className="w-12 h-12 object-cover rounded-[10px] mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 bg-pg-cream border border-pg-line rounded-[10px] mr-4 flex items-center justify-center">
                    <span className="text-pg-muted text-xl">📖</span>
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-fraunces)] text-xl font-medium text-pg-ink">
                    {word.word}
                  </h3>
                  <p className="text-sm text-pg-muted">
                    {word.isActive ? t("active") : t("inactive")}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(word)}
                    className="px-3 py-1.5 rounded-[8px] text-sm font-semibold text-pg-muted hover:text-pg-ink hover:bg-pg-cream"
                  >
                    {word.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleEdit(word)}
                    className="px-3 py-1.5 rounded-[8px] text-sm font-semibold text-pg-accent-deep hover:bg-[rgba(107,142,78,0.08)]"
                  >
                    {tCommon("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="px-3 py-1.5 rounded-[8px] text-sm font-semibold text-pg-coral hover:bg-[rgba(197,84,61,0.08)]"
                  >
                    {tCommon("delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showForm && (
        <SightWordForm
          sightWord={editingWord}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
