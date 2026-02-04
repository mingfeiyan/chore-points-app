"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Room = {
  id: string;
  name: string;
  type: string;
  on: boolean;
  brightness: number;
};

type Scene = {
  id: string;
  name: string;
  group?: string;
  type: string;
};

export default function LightsPageContent() {
  const t = useTranslations("hue");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLights = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roomsRes, scenesRes] = await Promise.all([
        fetch("/api/hue/rooms"),
        fetch("/api/hue/scenes"),
      ]);

      if (!roomsRes.ok || !scenesRes.ok) {
        throw new Error("Failed to fetch");
      }

      const roomsData = await roomsRes.json();
      const scenesData = await scenesRes.json();

      setRooms(roomsData.rooms);
      setScenes(scenesData.scenes);
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchLights();
  }, [fetchLights]);

  const toggleRoom = async (roomId: string, currentState: boolean) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, on: !currentState } : room
      )
    );

    try {
      const response = await fetch(`/api/hue/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !currentState }),
      });

      if (!response.ok) {
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, on: currentState } : room
          )
        );
      }
    } catch {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, on: currentState } : room
        )
      );
    }
  };

  const setBrightness = async (roomId: string, brightness: number) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, brightness } : room
      )
    );

    try {
      await fetch(`/api/hue/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brightness }),
      });
    } catch {
      // Silent fail, state already updated optimistically
    }
  };

  const [sceneError, setSceneError] = useState<string | null>(null);

  const activateScene = async (sceneId: string, groupId?: string) => {
    setSceneError(null);
    try {
      const response = await fetch(`/api/hue/scenes/${sceneId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!response.ok) {
        setSceneError(t("error"));
        return;
      }
      fetchLights();
    } catch {
      setSceneError(t("error"));
    }
  };

  // Group scenes by room
  const scenesByRoom = scenes.reduce<Record<string, Scene[]>>((acc, scene) => {
    const groupKey = scene.group || "all";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(scene);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">{t("loading")}</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchLights}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rooms Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t("rooms")}</h2>
          <button
            onClick={fetchLights}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t("refresh")}
          </button>
        </div>

        {rooms.length === 0 ? (
          <p className="text-gray-500">{t("noRooms")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`bg-white rounded-lg shadow p-4 transition-all ${
                  room.on ? "ring-2 ring-blue-200" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{room.name}</span>
                  <button
                    onClick={() => toggleRoom(room.id, room.on)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      room.on ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        room.on ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                {room.on && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 block mb-1">
                      {t("brightness")}: {room.brightness}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={room.brightness}
                      onChange={(e) =>
                        setRooms((prev) =>
                          prev.map((r) =>
                            r.id === room.id
                              ? { ...r, brightness: Number(e.target.value) }
                              : r
                          )
                        )
                      }
                      onMouseUp={(e) =>
                        setBrightness(room.id, Number((e.target as HTMLInputElement).value))
                      }
                      onTouchEnd={(e) =>
                        setBrightness(room.id, Number((e.target as HTMLInputElement).value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Scenes Section */}
      {scenes.length > 0 && (
        <section>
          {sceneError && (
            <p className="text-red-500 text-sm mb-2">{sceneError}</p>
          )}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t("scenes")}
          </h2>

          {Object.entries(scenesByRoom).map(([groupId, groupScenes]) => {
            const room = rooms.find((r) => r.id === groupId);
            const groupName = room?.name || t("allRooms");

            return (
              <div key={groupId} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  {groupName}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {groupScenes.map((scene) => (
                    <button
                      key={scene.id}
                      onClick={() => activateScene(scene.id, scene.group)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition"
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
