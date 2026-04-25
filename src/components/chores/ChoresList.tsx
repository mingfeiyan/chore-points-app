"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ChoreForm from "./ChoreForm";

type Chore = {
  id: string;
  title: string;
  icon: string | null;
  defaultPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string | null; email: string };
  updatedBy: { name: string | null; email: string };
};

const primaryBtn: React.CSSProperties = {
  background: "#4a6a32",
  boxShadow: "0 2px 0 rgba(74,106,50,0.3)",
};

export default function ChoresList() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("active");
  const t = useTranslations("parent");
  const tCommon = useTranslations("common");

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      const response = await fetch("/api/chores");
      const data = await response.json();
      if (response.ok) {
        setChores(data.chores);
      }
    } catch (error) {
      console.error("Failed to fetch chores:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteChore"))) return;

    try {
      const response = await fetch(`/api/chores/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setChores(chores.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete chore:", error);
    }
  };

  const handleToggleActive = async (chore: Chore) => {
    try {
      const response = await fetch(`/api/chores/${chore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !chore.isActive }),
      });

      if (response.ok) {
        const data = await response.json();
        setChores(chores.map((c) => (c.id === chore.id ? data.chore : c)));
      }
    } catch (error) {
      console.error("Failed to update chore:", error);
    }
  };

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingChore(null);
  };

  const handleFormSuccess = (chore: Chore) => {
    if (editingChore) {
      setChores(chores.map((c) => (c.id === chore.id ? chore : c)));
    } else {
      setChores([chore, ...chores]);
    }
    handleFormClose();
  };

  const filteredChores = chores.filter((chore) => {
    if (filter === "active") return chore.isActive;
    if (filter === "archived") return !chore.isActive;
    return true;
  });

  const filterChip = (value: "active" | "archived" | "all", label: string) => {
    const isSelected = filter === value;
    return (
      <button
        onClick={() => setFilter(value)}
        className={`px-4 py-2 min-h-[44px] rounded-[10px] text-sm font-semibold transition-colors ${
          isSelected
            ? "bg-white border border-pg-accent text-pg-ink"
            : "bg-transparent border border-pg-line text-pg-muted hover:bg-white"
        }`}
      >
        {label}
      </button>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-pg-muted">{tCommon("loading")}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex flex-wrap gap-2">
          {filterChip("active", t("active"))}
          {filterChip("archived", t("archived"))}
          {filterChip("all", "All")}
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-4 py-2 min-h-[44px] rounded-[10px] text-white text-sm font-semibold transition-transform hover:scale-[1.01]"
          style={primaryBtn}
        >
          {t("addChore")}
        </button>
      </div>

      {filteredChores.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[14px] border border-pg-line">
          <p className="text-pg-muted">
            {filter === "active"
              ? t("noActiveChores")
              : filter === "archived"
              ? t("noArchivedChores")
              : t("noChoresYet")}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredChores.map((chore) => (
              <div
                key={chore.id}
                className="bg-white rounded-[14px] border border-pg-line p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {chore.icon && (
                      <span className="text-2xl flex-shrink-0">{chore.icon}</span>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-pg-ink truncate">
                        {chore.title}
                      </div>
                      <div className="text-xs text-pg-muted">
                        {t("lastUpdatedBy")}{" "}
                        {chore.updatedBy.name || chore.updatedBy.email}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 text-xs leading-5 font-semibold rounded-full ${
                      chore.isActive
                        ? "bg-[rgba(107,142,78,0.15)] text-pg-accent-deep"
                        : "bg-pg-cream text-pg-muted border border-pg-line"
                    }`}
                  >
                    {chore.isActive ? t("active") : t("archived")}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-pg-accent-deep">
                    {chore.defaultPoints} pts
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(chore)}
                      className="px-3 py-2 min-h-[44px] text-pg-accent-deep hover:underline text-sm font-semibold"
                    >
                      {t("edit")}
                    </button>
                    <button
                      onClick={() => handleToggleActive(chore)}
                      className="px-3 py-2 min-h-[44px] text-pg-muted hover:text-pg-ink text-sm font-semibold"
                    >
                      {chore.isActive ? t("archive") : t("activate")}
                    </button>
                    <button
                      onClick={() => handleDelete(chore.id)}
                      className="px-3 py-2 min-h-[44px] text-pg-coral hover:underline text-sm font-semibold"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-[14px] border border-pg-line overflow-hidden">
            <table className="min-w-full divide-y divide-[rgba(68,55,32,0.08)]">
              <thead className="bg-pg-cream">
                <tr>
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                    {t("chore")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                    {tCommon("points")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                    {t("status")}
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                    {t("createdBy")}
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-pg-muted">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[rgba(68,55,32,0.08)]">
                {filteredChores.map((chore) => (
                  <tr key={chore.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {chore.icon && <span className="text-2xl">{chore.icon}</span>}
                        <div className="text-sm font-semibold text-pg-ink">
                          {chore.title}
                        </div>
                      </div>
                      <div className="text-xs text-pg-muted">
                        {t("lastUpdatedBy")}{" "}
                        {chore.updatedBy.name || chore.updatedBy.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-pg-accent-deep">
                        {chore.defaultPoints} pts
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          chore.isActive
                            ? "bg-[rgba(107,142,78,0.15)] text-pg-accent-deep"
                            : "bg-pg-cream text-pg-muted border border-pg-line"
                        }`}
                      >
                        {chore.isActive ? t("active") : t("archived")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-pg-muted">
                      {chore.createdBy.name || chore.createdBy.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold space-x-3">
                      <button
                        onClick={() => handleEdit(chore)}
                        className="text-pg-accent-deep hover:underline"
                      >
                        {t("edit")}
                      </button>
                      <button
                        onClick={() => handleToggleActive(chore)}
                        className="text-pg-muted hover:text-pg-ink"
                      >
                        {chore.isActive ? t("archive") : t("activate")}
                      </button>
                      <button
                        onClick={() => handleDelete(chore.id)}
                        className="text-pg-coral hover:underline"
                      >
                        {t("delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <ChoreForm
          chore={editingChore}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
