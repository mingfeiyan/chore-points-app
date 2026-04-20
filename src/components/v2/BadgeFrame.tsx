import React from "react";

interface BadgeFrameProps {
  content: string | React.ReactNode;
  earned: boolean;
  tier?: number;
  size?: number;
}

const tierColors = [
  "#e0e0e0",
  "#cd7f32",
  "#c0c0c0",
  "#ffd700",
  "#b49ef0",
  "#ff9dbf",
];

export default function BadgeFrame({
  content,
  earned,
  tier = 0,
  size = 80,
}: BadgeFrameProps) {
  const ringColor = tierColors[tier] ?? tierColors[0];
  const innerSize = size - 12;

  const renderContent = () => {
    if (typeof content === "string") {
      if (content.startsWith("http")) {
        return (
          <img
            src={content}
            alt="Badge"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        );
      }
      // Emoji or text
      return (
        <span style={{ fontSize: innerSize * 0.55, lineHeight: 1 }}>
          {content}
        </span>
      );
    }
    // ReactNode
    return content;
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `3px solid ${ringColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        filter: earned ? "none" : "grayscale(1)",
        opacity: earned ? 1 : 0.5,
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: "50%",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderContent()}
      </div>

      {!earned && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.3,
          }}
        >
          🔒
        </div>
      )}
    </div>
  );
}
