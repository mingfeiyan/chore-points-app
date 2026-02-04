"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

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

export default function LightsWidget() {
  const t = useTranslations("hue");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/hue/status");
      const data = await response.json();
      setIsConnected(data.connected);

      if (data.connected) {
        await fetchLights();
      }
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLights = async () => {
    try {
      const [roomsRes, scenesRes] = await Promise.all([
        fetch("/api/hue/rooms"),
        fetch("/api/hue/scenes"),
      ]);

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData.rooms.slice(0, 4)); // Show max 4 rooms
      }

      if (scenesRes.ok) {
        const scenesData = await scenesRes.json();
        setScenes(scenesData.scenes.slice(0, 3)); // Show max 3 scenes
      }
    } catch {
      setError(t("error"));
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/hue/auth");
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t("connectError"));
      setIsConnecting(false);
    }
  };

  const toggleRoom = async (roomId: string, currentState: boolean) => {
    // Optimistic update
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
        // Revert on failure
        setRooms((prev) =>
          prev.map((room) =>
            room.id === roomId ? { ...room, on: currentState } : room
          )
        );
      }
    } catch {
      // Revert on failure
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, on: currentState } : room
        )
      );
    }
  };

  const activateScene = async (sceneId: string, groupId?: string) => {
    try {
      const response = await fetch(`/api/hue/scenes/${sceneId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      // Refresh room states after scene activation
      fetchLights();
    } catch {
      setError(t("error"));
    }
  };

  const turnAllOff = async () => {
    // Turn off all rooms
    for (const room of rooms.filter((r) => r.on)) {
      await toggleRoom(room.id, true);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4 text-gray-500">{t("loading")}</div>
      </div>
    );
  }

  if (error && !isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              checkStatus();
            }}
            className="text-blue-600 hover:text-blue-800"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("title")}</h2>
        <div className="text-center py-4">
          <p className="text-gray-500 mb-4">{t("connectDesc")}</p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? "..." : t("connect")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
        <Link
          href="/lights"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {t("seeAll")}
        </Link>
      </div>

      {/* Quick Scenes */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={turnAllOff}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          {t("allOff")}
        </button>
        {scenes.slice(0, 2).map((scene) => (
          <button
            key={scene.id}
            onClick={() => activateScene(scene.id, scene.group)}
            className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
          >
            {scene.name}
          </button>
        ))}
      </div>

      {/* Room Controls */}
      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500">{t("noRooms")}</p>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-900">{room.name}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
