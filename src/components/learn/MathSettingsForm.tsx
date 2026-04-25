"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface MathSettings {
  dailyQuestionCount: number;
  additionEnabled: boolean;
  subtractionEnabled: boolean;
  multiplicationEnabled: boolean;
  divisionEnabled: boolean;
  additionMinA: number;
  additionMaxA: number;
  additionMinB: number;
  additionMaxB: number;
  allowCarrying: boolean;
  subtractionMinA: number;
  subtractionMaxA: number;
  subtractionMinB: number;
  subtractionMaxB: number;
  allowBorrowing: boolean;
  multiplicationMinA: number;
  multiplicationMaxA: number;
  multiplicationMinB: number;
  multiplicationMaxB: number;
  divisionMinDividend: number;
  divisionMaxDividend: number;
  divisionMinDivisor: number;
  divisionMaxDivisor: number;
  adaptiveDifficulty: boolean;
}

const defaultSettings: MathSettings = {
  dailyQuestionCount: 2,
  additionEnabled: true,
  subtractionEnabled: true,
  multiplicationEnabled: false,
  divisionEnabled: false,
  additionMinA: 1,
  additionMaxA: 9,
  additionMinB: 10,
  additionMaxB: 99,
  allowCarrying: true,
  subtractionMinA: 10,
  subtractionMaxA: 99,
  subtractionMinB: 1,
  subtractionMaxB: 9,
  allowBorrowing: true,
  multiplicationMinA: 1,
  multiplicationMaxA: 10,
  multiplicationMinB: 1,
  multiplicationMaxB: 10,
  divisionMinDividend: 1,
  divisionMaxDividend: 100,
  divisionMinDivisor: 1,
  divisionMaxDivisor: 10,
  adaptiveDifficulty: false,
};

export default function MathSettingsForm() {
  const t = useTranslations("learn");
  const tCommon = useTranslations("common");
  const [settings, setSettings] = useState<MathSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/math/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSettings({ ...defaultSettings, ...data });
        }
        setLoading(false);
      })
      .catch(() => {
        setError(tCommon("somethingWentWrong"));
        setLoading(false);
      });
  }, [tCommon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/math/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || tCommon("somethingWentWrong"));
      }
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof MathSettings>(
    key: K,
    value: MathSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[rgba(68,55,32,0.06)] rounded w-1/4"></div>
          <div className="h-10 bg-[rgba(68,55,32,0.06)] rounded"></div>
          <div className="h-4 bg-[rgba(68,55,32,0.06)] rounded w-1/3"></div>
          <div className="h-10 bg-[rgba(68,55,32,0.06)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wide text-pg-muted">
          Learning Center
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl md:text-[32px] font-medium text-pg-ink leading-tight tracking-tight">
          {t("mathSettings")}
        </h1>
        <p className="text-pg-muted mt-2">{t("mathSettingsDesc")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
      {/* Daily Question Count */}
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <label className="block text-sm font-medium text-pg-ink mb-2">
          {t("dailyQuestionCount")}
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={settings.dailyQuestionCount}
          onChange={(e) =>
            updateSetting("dailyQuestionCount", parseInt(e.target.value) || 1)
          }
          className="w-24 px-3 py-2 border border-pg-line rounded-[10px] bg-white text-pg-ink focus:outline-none focus:border-pg-accent transition-colors"
        />
        <p className="text-sm text-pg-muted mt-1">1-20</p>
      </div>

      {/* Question Types */}
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <h3 className="text-lg font-medium text-pg-ink mb-4">
          {t("questionTypes")}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 border border-pg-line rounded-lg hover:bg-pg-cream cursor-pointer">
            <input
              type="checkbox"
              checked={settings.additionEnabled}
              onChange={(e) =>
                updateSetting("additionEnabled", e.target.checked)
              }
              className="w-5 h-5 accent-[#6b8e4e] rounded"
            />
            <span className="text-pg-ink">{t("enableAddition")}</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-pg-line rounded-lg hover:bg-pg-cream cursor-pointer">
            <input
              type="checkbox"
              checked={settings.subtractionEnabled}
              onChange={(e) =>
                updateSetting("subtractionEnabled", e.target.checked)
              }
              className="w-5 h-5 accent-[#6b8e4e] rounded"
            />
            <span className="text-pg-ink">{t("enableSubtraction")}</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-pg-line rounded-lg hover:bg-pg-cream cursor-pointer">
            <input
              type="checkbox"
              checked={settings.multiplicationEnabled}
              onChange={(e) =>
                updateSetting("multiplicationEnabled", e.target.checked)
              }
              className="w-5 h-5 accent-[#6b8e4e] rounded"
            />
            <span className="text-pg-ink">{t("enableMultiplication")}</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-pg-line rounded-lg hover:bg-pg-cream cursor-pointer">
            <input
              type="checkbox"
              checked={settings.divisionEnabled}
              onChange={(e) =>
                updateSetting("divisionEnabled", e.target.checked)
              }
              className="w-5 h-5 accent-[#6b8e4e] rounded"
            />
            <span className="text-pg-ink">{t("enableDivision")}</span>
          </label>
        </div>
      </div>

      {/* Addition Settings */}
      {settings.additionEnabled && (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <h3 className="text-lg font-medium text-pg-ink mb-4">
            {t("addition")} - {t("numberRanges")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("firstNumber")}:
              </span>
              <input
                type="number"
                min={0}
                value={settings.additionMinA}
                onChange={(e) =>
                  updateSetting("additionMinA", parseInt(e.target.value) || 0)
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={0}
                value={settings.additionMaxA}
                onChange={(e) =>
                  updateSetting("additionMaxA", parseInt(e.target.value) || 0)
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("secondNumber")}:
              </span>
              <input
                type="number"
                min={0}
                value={settings.additionMinB}
                onChange={(e) =>
                  updateSetting("additionMinB", parseInt(e.target.value) || 0)
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={0}
                value={settings.additionMaxB}
                onChange={(e) =>
                  updateSetting("additionMaxB", parseInt(e.target.value) || 0)
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <label className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                checked={settings.allowCarrying}
                onChange={(e) =>
                  updateSetting("allowCarrying", e.target.checked)
                }
                className="w-5 h-5 accent-[#6b8e4e] rounded"
              />
              <span className="text-sm text-pg-ink">{t("allowCarrying")}</span>
            </label>
          </div>
        </div>
      )}

      {/* Subtraction Settings */}
      {settings.subtractionEnabled && (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <h3 className="text-lg font-medium text-pg-ink mb-4">
            {t("subtraction")} - {t("numberRanges")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("firstNumber")}:
              </span>
              <input
                type="number"
                min={0}
                value={settings.subtractionMinA}
                onChange={(e) =>
                  updateSetting(
                    "subtractionMinA",
                    parseInt(e.target.value) || 0
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={0}
                value={settings.subtractionMaxA}
                onChange={(e) =>
                  updateSetting(
                    "subtractionMaxA",
                    parseInt(e.target.value) || 0
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("secondNumber")}:
              </span>
              <input
                type="number"
                min={0}
                value={settings.subtractionMinB}
                onChange={(e) =>
                  updateSetting(
                    "subtractionMinB",
                    parseInt(e.target.value) || 0
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={0}
                value={settings.subtractionMaxB}
                onChange={(e) =>
                  updateSetting(
                    "subtractionMaxB",
                    parseInt(e.target.value) || 0
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <label className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                checked={settings.allowBorrowing}
                onChange={(e) =>
                  updateSetting("allowBorrowing", e.target.checked)
                }
                className="w-5 h-5 accent-[#6b8e4e] rounded"
              />
              <span className="text-sm text-pg-ink">
                {t("allowBorrowing")}
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Multiplication Settings */}
      {settings.multiplicationEnabled && (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <h3 className="text-lg font-medium text-pg-ink mb-4">
            {t("multiplication")} - {t("numberRanges")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("firstNumber")}:
              </span>
              <input
                type="number"
                min={1}
                value={settings.multiplicationMinA}
                onChange={(e) =>
                  updateSetting(
                    "multiplicationMinA",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={1}
                value={settings.multiplicationMaxA}
                onChange={(e) =>
                  updateSetting(
                    "multiplicationMaxA",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">
                {t("secondNumber")}:
              </span>
              <input
                type="number"
                min={1}
                value={settings.multiplicationMinB}
                onChange={(e) =>
                  updateSetting(
                    "multiplicationMinB",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={1}
                value={settings.multiplicationMaxB}
                onChange={(e) =>
                  updateSetting(
                    "multiplicationMaxB",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Division Settings */}
      {settings.divisionEnabled && (
        <div className="bg-white rounded-[14px] border border-pg-line p-6">
          <h3 className="text-lg font-medium text-pg-ink mb-4">
            {t("division")} - {t("numberRanges")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">{t("dividend")}:</span>
              <input
                type="number"
                min={1}
                value={settings.divisionMinDividend}
                onChange={(e) =>
                  updateSetting(
                    "divisionMinDividend",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={1}
                value={settings.divisionMaxDividend}
                onChange={(e) =>
                  updateSetting(
                    "divisionMaxDividend",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-pg-muted w-28">{t("divisor")}:</span>
              <input
                type="number"
                min={1}
                value={settings.divisionMinDivisor}
                onChange={(e) =>
                  updateSetting(
                    "divisionMinDivisor",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
              <span className="text-pg-muted">{t("to")}</span>
              <input
                type="number"
                min={1}
                value={settings.divisionMaxDivisor}
                onChange={(e) =>
                  updateSetting(
                    "divisionMaxDivisor",
                    parseInt(e.target.value) || 1
                  )
                }
                className="w-20 px-3 py-2 border border-pg-line rounded-lg focus:outline-none focus:border-pg-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="bg-white rounded-[14px] border border-pg-line p-6">
        <h3 className="text-lg font-medium text-pg-ink mb-4">
          {t("advancedSettings")}
        </h3>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={settings.adaptiveDifficulty}
            onChange={(e) =>
              updateSetting("adaptiveDifficulty", e.target.checked)
            }
            className="w-5 h-5 accent-[#6b8e4e] rounded mt-0.5"
          />
          <div>
            <span className="text-pg-ink font-medium">
              {t("adaptiveDifficulty")}
            </span>
            <p className="text-sm text-pg-muted">{t("adaptiveDifficultyDesc")}</p>
          </div>
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-[rgba(197,84,61,0.08)] border border-[rgba(197,84,61,0.25)] text-pg-coral rounded-[10px] p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 text-white font-semibold rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-transform hover:scale-[1.01]"
          style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
        >
          {saving ? t("savingSettings") : t("saveSettings")}
        </button>
        {saved && (
          <span className="text-pg-accent-deep font-semibold">{t("settingsSaved")}</span>
        )}
      </div>
    </form>

      {/* Custom Questions Link */}
      <div className="mt-8 p-6 bg-white rounded-[14px] border border-pg-line">
        <h3 className="text-lg font-semibold text-pg-ink mb-2">{t("customQuestionsTitle")}</h3>
        <p className="text-pg-muted mb-4">
          {t("customQuestionsLinkDesc")}
        </p>
        <Link
          href="/learn/questions"
          className="inline-flex items-center px-4 py-2 text-white rounded-[10px] font-semibold transition-transform hover:scale-[1.01]"
          style={{ background: "#4a6a32", boxShadow: "0 2px 0 rgba(74,106,50,0.3)" }}
        >
          {t("scheduleCustomQuestions")} →
        </Link>
      </div>
    </>
  );
}
