"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useKidMode } from "@/components/providers/KidModeProvider";

type Kid = {
  id: string;
  name: string | null;
  email: string;
};

type Weather = {
  temperature: number;
  description: string;
  icon: string;
  location: string;
};

// Get time-based greeting key
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 18) return "goodAfternoon";
  return "goodEvening";
}

// Format today's date
function formatDate(locale: string): string {
  return new Date().toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Weather code to description and emoji
function getWeatherInfo(code: number): { description: string; icon: string } {
  // WMO Weather interpretation codes
  const weatherMap: Record<number, { description: string; icon: string }> = {
    0: { description: "Clear", icon: "☀️" },
    1: { description: "Mainly clear", icon: "🌤️" },
    2: { description: "Partly cloudy", icon: "⛅" },
    3: { description: "Overcast", icon: "☁️" },
    45: { description: "Foggy", icon: "🌫️" },
    48: { description: "Foggy", icon: "🌫️" },
    51: { description: "Light drizzle", icon: "🌧️" },
    53: { description: "Drizzle", icon: "🌧️" },
    55: { description: "Heavy drizzle", icon: "🌧️" },
    61: { description: "Light rain", icon: "🌧️" },
    63: { description: "Rain", icon: "🌧️" },
    65: { description: "Heavy rain", icon: "🌧️" },
    71: { description: "Light snow", icon: "🌨️" },
    73: { description: "Snow", icon: "🌨️" },
    75: { description: "Heavy snow", icon: "❄️" },
    77: { description: "Snow grains", icon: "🌨️" },
    80: { description: "Light showers", icon: "🌦️" },
    81: { description: "Showers", icon: "🌦️" },
    82: { description: "Heavy showers", icon: "⛈️" },
    85: { description: "Light snow showers", icon: "🌨️" },
    86: { description: "Snow showers", icon: "🌨️" },
    95: { description: "Thunderstorm", icon: "⛈️" },
    96: { description: "Thunderstorm with hail", icon: "⛈️" },
    99: { description: "Thunderstorm with hail", icon: "⛈️" },
  };
  return weatherMap[code] || { description: "Unknown", icon: "🌡️" };
}

export default function ParentDashboardHeader() {
  const t = useTranslations("parent");
  const tKidMode = useTranslations("kidMode");
  const { data: session } = useSession();
  const [kids, setKids] = useState<Kid[]>([]);
  const [showKidSelector, setShowKidSelector] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [dateString, setDateString] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const { setViewingAsKid, exitKidMode } = useKidMode();
  const router = useRouter();

  useEffect(() => {
    // Clear kid mode when parent visits the dashboard
    // This ensures the banner doesn't show incorrectly
    exitKidMode();

    fetchKids();
    // Set greeting and date on client side to avoid hydration mismatch
    setGreeting(getGreetingKey());
    setDateString(formatDate("en"));
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      // Get user's location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            // Fetch weather and location name in parallel
            const [weatherResponse, geoResponse] = await Promise.all([
              fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
              ),
              fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              ),
            ]);

            const weatherData = await weatherResponse.json();
            const geoData = await geoResponse.json();

            if (weatherData.current) {
              const weatherInfo = getWeatherInfo(weatherData.current.weather_code);
              // Get city name from reverse geocoding (prefer city, then town, then county)
              const locationName = geoData.address?.city ||
                                   geoData.address?.town ||
                                   geoData.address?.county ||
                                   geoData.address?.state ||
                                   "";
              setWeather({
                temperature: Math.round(weatherData.current.temperature_2m),
                description: weatherInfo.description,
                icon: weatherInfo.icon,
                location: locationName,
              });
            }
          },
          () => {
            // If location denied, use default location (Seattle)
            fetchWeatherForLocation(47.6062, -122.3321, "Seattle");
          }
        );
      } else {
        // Fallback to default location
        fetchWeatherForLocation(47.6062, -122.3321, "Seattle");
      }
    } catch (error) {
      console.error("Failed to fetch weather:", error);
    }
  };

  const fetchWeatherForLocation = async (lat: number, lon: number, locationName: string) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
      );
      const data = await response.json();
      if (data.current) {
        const weatherInfo = getWeatherInfo(data.current.weather_code);
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          location: locationName,
        });
      }
    } catch (error) {
      console.error("Failed to fetch weather:", error);
    }
  };

  const fetchKids = async () => {
    try {
      const response = await fetch("/api/family/kids");
      const data = await response.json();
      if (response.ok) {
        setKids(data.kids);
      }
    } catch (error) {
      console.error("Failed to fetch kids:", error);
    }
  };

  const handleViewAsKid = (kid: Kid) => {
    setViewingAsKid(kid);
    setShowKidSelector(false);
    router.push("/view-as/points");
  };

  // Get user's first name
  const userName = session?.user?.name?.split(" ")[0] || "";

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting && userName ? `${t(greeting)}, ${userName}` : t("dashboard")}
        </h1>
        <div className="mt-1 flex items-center gap-3 text-gray-500">
          {dateString && <span>{dateString}</span>}
          {weather && (
            <span className="flex items-center gap-1 text-gray-600">
              {weather.location && (
                <>
                  <span className="text-sm">{weather.location}</span>
                  <span className="text-gray-400">·</span>
                </>
              )}
              <span className="text-lg">{weather.icon}</span>
              <span>{weather.temperature}°F</span>
              <span className="text-gray-400">·</span>
              <span className="text-sm">{weather.description}</span>
            </span>
          )}
        </div>
      </div>

      {kids.length > 0 && (
        <div className="relative">
          {/* Single kid: direct navigation, no dropdown */}
          {kids.length === 1 ? (
            <button
              onClick={() => handleViewAsKid(kids[0])}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {tKidMode("viewAsKid")}
            </button>
          ) : (
            /* Multiple kids: show dropdown */
            <>
              <button
                onClick={() => setShowKidSelector(!showKidSelector)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-all shadow-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {tKidMode("viewAsKid")}
                <svg
                  className={`w-4 h-4 transition-transform ${showKidSelector ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showKidSelector && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    {tKidMode("viewAsKidDesc")}
                  </div>
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      onClick={() => handleViewAsKid(kid)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
                    >
                      <span className="text-xl">👤</span>
                      <span className="font-medium text-gray-900">
                        {kid.name || kid.email}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
