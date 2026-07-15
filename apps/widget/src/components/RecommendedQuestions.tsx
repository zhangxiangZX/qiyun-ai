import styles from "../styles/widget.module.css";

interface RecommendedQuestionsProps {
  questions: string[];
  accent: string;
  label?: string;
  disabled?: boolean;
  onSelect: (question: string) => void;
}

export function RecommendedQuestions({
  questions,
  accent,
  label = "您可以这样问：",
  disabled = false,
  onSelect,
}: RecommendedQuestionsProps) {
  if (!questions.length) {
    return null;
  }

  return (
    <div className={styles.recommendedQuestions} role="region" aria-label="推荐问题">
      <p className={styles.recommendedQuestionsLabel}>{label}</p>
      <div className={styles.recommendedQuestionsList}>
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            className={styles.questionChip}
            style={{ borderColor: accent, color: accent }}
            disabled={disabled}
            onClick={() => onSelect(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
