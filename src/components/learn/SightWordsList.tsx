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
  const t = useTranslations("sightWords");
  const tCommon = useTranslations("common");

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
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">{t("pageTitle")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          {t("addWord")}
        </button>
      </div>

      {sightWords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <span className="text-6xl mb-4 block">📚</span>
          <p className="text-gray-500">{t("noWordsYet")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{t("dragToReorder")}</p>
          <div className="space-y-2">
            {sightWords.map((word, index) => (
              <div
                key={word.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`bg-white rounded-lg shadow p-4 flex items-center cursor-move hover:shadow-md transition-shadow ${
                  draggedIndex === index ? "opacity-50" : ""
                } ${!word.isActive ? "opacity-60" : ""}`}
              >
                {/* Drag handle */}
                <div className="mr-3 text-gray-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                  </svg>
                </div>

                {/* Order number */}
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-4">
                  {index + 1}
                </div>

                {/* Image thumbnail */}
                {word.imageUrl ? (
                  <img
                    src={word.imageUrl}
                    alt={word.word}
                    className="w-12 h-12 object-cover rounded-lg mr-4"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg mr-4 flex items-center justify-center">
                    <span className="text-gray-400 text-xl">📖</span>
                  </div>
                )}

                {/* Word */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{word.word}</h3>
                  <p className="text-sm text-gray-500">
                    {word.isActive ? t("active") : t("inactive")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(word)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      word.isActive
                        ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {word.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleEdit(word)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                  >
                    {tCommon("edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(word.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
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
