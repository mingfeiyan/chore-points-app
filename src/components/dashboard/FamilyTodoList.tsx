"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Todo = {
  id: string;
  title: string;
  icon: string | null;
  isCompleted: boolean;
  dueDate: string | null;
  assignedTo: string | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  createdAt: string;
};

// Assignee options
const ASSIGNEES = [
  { value: "both", label: "Both", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "Yue", label: "Yue", color: "bg-pink-100 text-pink-700 border-pink-300" },
  { value: "Mingfei", label: "Mingfei", color: "bg-green-100 text-green-700 border-green-300" },
];

const TODO_ICONS = [
  // Travel & Transportation
  "🚗", "✈️", "🛳️", "🚂", "🏕️", "🏖️", "🗺️", "🧳",
  // Family Activities
  "🎢", "🎡", "🎠", "🎬", "🎭", "🎪", "🎮", "🎲",
  // Sports & Outdoors
  "⚽", "🏀", "🎾", "🏊", "🚴", "⛷️", "🎣", "🥾",
  // Food & Celebrations
  "🍽️", "🎂", "🎉", "🎄", "🎃", "🥳", "🍕", "🍿",
  // Health & Home
  "💊", "🏥", "🏠", "🧹", "🛠️", "🌱", "🐕", "🐈",
  // School & Work
  "📚", "🎒", "✏️", "💼", "📅", "📝", "💰", "🛒",
];

export default function FamilyTodoList() {
  const t = useTranslations("todos");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch("/api/todos");
      const data = await response.json();
      if (response.ok) {
        setTodos(data.todos);
      }
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          icon: selectedIcon,
          assignedTo: selectedAssignee,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTodos([data.todo, ...todos]);
        setNewTodoTitle("");
        setSelectedIcon(null);
        setSelectedAssignee(null);
        setShowIconPicker(false);
        setShowAssigneePicker(false);
      } else {
        console.error("Failed to add todo:", data.error);
      }
    } catch (error) {
      console.error("Failed to add todo:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTodo = async (todoId: string, isCompleted: boolean) => {
    // Optimistic update
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, isCompleted: !isCompleted } : todo
      )
    );

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });

      if (!response.ok) {
        // Revert on failure
        setTodos(
          todos.map((todo) =>
            todo.id === todoId ? { ...todo, isCompleted } : todo
          )
        );
      } else {
        // Re-sort after toggle
        fetchTodos();
      }
    } catch (error) {
      console.error("Failed to toggle todo:", error);
      // Revert on failure
      setTodos(
        todos.map((todo) =>
          todo.id === todoId ? { ...todo, isCompleted } : todo
        )
      );
    }
  };

  const deleteTodo = async (todoId: string) => {
    // Optimistic update
    const previousTodos = todos;
    setTodos(todos.filter((todo) => todo.id !== todoId));

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on failure
        setTodos(previousTodos);
      }
    } catch (error) {
      console.error("Failed to delete todo:", error);
      setTodos(previousTodos);
    }
  };

  const incompleteTodos = todos.filter((todo) => !todo.isCompleted);
  const completedTodos = todos.filter((todo) => todo.isCompleted);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {t("title")}
      </h2>

      {/* Add Todo Form */}
      <form onSubmit={addTodo} className="mb-4">
        <div className="flex gap-2">
          {/* Icon Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition text-xl"
            >
              {selectedIcon || "📝"}
            </button>

            {/* Icon Picker Dropdown */}
            {showIconPicker && (
              <div className="absolute top-12 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-64">
                <p className="text-xs text-gray-500 mb-2 px-1">{t("pickIcon")}</p>
                <div className="grid grid-cols-8 gap-1">
                  {TODO_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => {
                        setSelectedIcon(icon);
                        setShowIconPicker(false);
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition text-lg ${
                        selectedIcon === icon ? "bg-blue-100 ring-2 ring-blue-500" : ""
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                {selectedIcon && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIcon(null);
                      setShowIconPicker(false);
                    }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                  >
                    {t("clearIcon")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Assignee Picker Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAssigneePicker(!showAssigneePicker);
                setShowIconPicker(false);
              }}
              className={`h-10 px-3 flex items-center justify-center border rounded-lg hover:bg-gray-50 transition text-sm ${
                selectedAssignee
                  ? ASSIGNEES.find((a) => a.value === selectedAssignee)?.color || "border-gray-300"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {selectedAssignee
                ? ASSIGNEES.find((a) => a.value === selectedAssignee)?.label
                : t("assignTo")}
            </button>

            {/* Assignee Picker Dropdown */}
            {showAssigneePicker && (
              <div className="absolute top-12 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-36">
                <p className="text-xs text-gray-500 mb-2 px-1">{t("assignTo")}</p>
                <div className="space-y-1">
                  {ASSIGNEES.map((assignee) => (
                    <button
                      key={assignee.value}
                      type="button"
                      onClick={() => {
                        setSelectedAssignee(assignee.value);
                        setShowAssigneePicker(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-sm rounded border transition ${
                        selectedAssignee === assignee.value
                          ? assignee.color + " ring-2 ring-offset-1"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {assignee.label}
                    </button>
                  ))}
                </div>
                {selectedAssignee && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssignee(null);
                      setShowAssigneePicker(false);
                    }}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 w-full text-center"
                  >
                    {t("clearAssignee")}
                  </button>
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder={t("addPlaceholder")}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isAdding}
          />
          <button
            type="submit"
            disabled={!newTodoTitle.trim() || isAdding}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isAdding ? t("adding") : t("add")}
          </button>
        </div>
      </form>

      {/* Todo List */}
      {isLoading ? (
        <div className="text-center py-4 text-gray-500">{t("loading")}</div>
      ) : todos.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p>{t("noTodos")}</p>
          <p className="text-sm mt-1">{t("addFirst")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Incomplete Todos */}
          {incompleteTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.isCompleted)}
                className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-500 transition flex items-center justify-center"
              >
                {todo.isCompleted && (
                  <svg
                    className="w-3 h-3 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
              {todo.icon && (
                <span className="text-lg flex-shrink-0">{todo.icon}</span>
              )}
              <span className="flex-1 text-gray-900">{todo.title}</span>
              {todo.assignedTo && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    ASSIGNEES.find((a) => a.value === todo.assignedTo)?.color || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ASSIGNEES.find((a) => a.value === todo.assignedTo)?.label || todo.assignedTo}
                </span>
              )}
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">{t("completed")}</p>
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 group"
                >
                  <button
                    onClick={() => toggleTodo(todo.id, todo.isCompleted)}
                    className="flex-shrink-0 w-5 h-5 rounded border-2 border-green-500 bg-green-500 transition flex items-center justify-center"
                  >
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {todo.icon && (
                    <span className="text-lg flex-shrink-0 opacity-50">{todo.icon}</span>
                  )}
                  <span className="flex-1 text-gray-400 line-through">
                    {todo.title}
                  </span>
                  {todo.assignedTo && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border opacity-50 ${
                        ASSIGNEES.find((a) => a.value === todo.assignedTo)?.color || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {ASSIGNEES.find((a) => a.value === todo.assignedTo)?.label || todo.assignedTo}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
