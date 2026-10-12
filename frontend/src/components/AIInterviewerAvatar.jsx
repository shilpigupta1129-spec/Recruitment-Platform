function AIInterviewerAvatar({
  isSpeaking,
  imageSrc = "/avatars/AI_female.png",
}) {
  return (
    <div className="ai-avatar-container">
      <style>{`
        .ai-avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          color: white;
        }

        .ai-avatar-portrait {
          position: relative;
          width: min(220px, 70vw);
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 110px 110px 28px 28px;
          background: linear-gradient(145deg, #334155, #0f172a);
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.3);
          transition: box-shadow 0.3s ease;
        }

        .ai-avatar-portrait.speaking {
          box-shadow:
            0 0 0 4px rgba(59, 130, 246, 0.35),
            0 0 28px rgba(59, 130, 246, 0.5);
        }

        .ai-avatar-portrait img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
        }

        .ai-avatar-status {
          font-size: 14px;
          color: #cbd5e1;
          text-align: center;
        }

        .ai-avatar-status.speaking {
          color: #60a5fa;
        }

        .ai-speaking-indicator {
          display: none;
          gap: 4px;
          align-items: center;
          justify-content: center;
          margin-top: -5px;
        }

        .ai-speaking-indicator.active {
          display: flex;
        }

        .ai-speaking-indicator span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #60a5fa;
          animation: aiVoicePulse 0.7s ease-in-out infinite alternate;
        }

        .ai-speaking-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .ai-speaking-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes aiVoicePulse {
          from { transform: scaleY(1); opacity: 0.5; }
          to { transform: scaleY(2.8); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ai-speaking-indicator span {
            animation: none;
          }

          .ai-avatar-portrait {
            transition: none;
          }
        }
      `}</style>

      <div
        className={`ai-avatar-portrait ${
          isSpeaking ? "speaking" : ""
        }`}
      >
        <img
          src={imageSrc}
          alt="AI female interviewer"
          onError={(event) => {
            event.currentTarget.style.visibility = "hidden";
          }}
        />
      </div>

      <strong>AI Interviewer</strong>

      <div
        className={`ai-speaking-indicator ${
          isSpeaking ? "active" : ""
        }`}
        aria-hidden="true"
      >
        <span />
        <span />
        <span />
      </div>

      <div
        className={`ai-avatar-status ${
          isSpeaking ? "speaking" : ""
        }`}
        aria-live="polite"
      >
        {isSpeaking ? "Speaking..." : "Ready for your answer"}
      </div>
    </div>
  );
}

export default AIInterviewerAvatar;